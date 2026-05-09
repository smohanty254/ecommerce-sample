import { Router, IRouter } from "express";
import { db, ordersTable, orderItemsTable, cartsTable, cartItemsTable, productsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { GetOrderParams, CreateOrderBody, UpdateOrderStatusParams, UpdateOrderStatusBody, ListOrdersQueryParams } from "@workspace/api-zod";
import { emitToUser, emitToAdmin } from "../lib/socket";

const router: IRouter = Router();

async function buildOrderResponse(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.userId));
  return {
    id: order.id,
    userId: order.userId,
    userName: user?.name ?? null,
    status: order.status,
    total: Number(order.total),
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    trackingNumber: order.trackingNumber,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      price: Number(i.price),
      quantity: i.quantity,
      subtotal: Number(i.price) * i.quantity,
      imageUrl: i.imageUrl,
    })),
  };
}

router.get("/orders", authenticate, async (req, res): Promise<void> => {
  const q = ListOrdersQueryParams.safeParse(req.query);
  const page = q.success ? (q.data.page ?? 1) : 1;
  const limit = q.success ? (q.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const isAdmin = req.user!.role === "admin" || req.user!.role === "manager";
  const userId = isAdmin && q.success && q.data.userId ? q.data.userId : req.user!.userId;

  const where = isAdmin && !(q.success && q.data.userId)
    ? undefined
    : eq(ordersTable.userId, userId);

  const [countResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(where),
    db.select().from(ordersTable).where(where).orderBy(desc(ordersTable.createdAt)).limit(limit).offset(offset),
  ]);

  const data = await Promise.all(rows.map(buildOrderResponse));
  res.json({ data, total: countResult[0]?.count ?? 0, page, limit });
});

router.post("/orders", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [cart] = await db.select().from(cartsTable).where(eq(cartsTable.userId, req.user!.userId));
  if (!cart) { res.status(400).json({ error: "Cart is empty" }); return; }
  const cartItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
  if (!cartItems.length) { res.status(400).json({ error: "Cart is empty" }); return; }

  const itemDetails = await Promise.all(
    cartItems.map(async (ci) => {
      const [p] = await db.select().from(productsTable).where(eq(productsTable.id, ci.productId));
      return { cartItem: ci, product: p };
    })
  );

  const total = itemDetails.reduce((acc, { cartItem, product }) =>
    acc + (product ? Number(product.price) * cartItem.quantity : 0), 0);

  const [order] = await db.insert(ordersTable).values({
    userId: req.user!.userId,
    total: String(total),
    shippingAddress: parsed.data.shippingAddress,
    paymentMethod: parsed.data.paymentMethod,
    notes: parsed.data.notes ?? null,
  }).returning();

  await db.insert(orderItemsTable).values(
    itemDetails.filter(({ product }) => product).map(({ cartItem, product }) => ({
      orderId: order.id,
      productId: cartItem.productId,
      productName: product!.name,
      price: product!.price,
      quantity: cartItem.quantity,
      imageUrl: product!.imageUrl,
    }))
  );

  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));

  await db.insert(notificationsTable).values({
    userId: req.user!.userId,
    type: "order_placed",
    title: `Order #${order.id} placed`,
    message: `Your order has been placed. Total: $${total.toFixed(2)}`,
    metadata: { orderId: order.id },
  });

  const response = await buildOrderResponse(order);
  emitToUser(req.user!.userId, "order:placed", response);
  emitToAdmin("order:new", response);

  res.status(201).json(response);
});

router.get("/orders/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const isAdmin = req.user!.role === "admin" || req.user!.role === "manager";
  if (!isAdmin && order.userId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  res.json(await buildOrderResponse(order));
});

router.patch("/orders/:id/status", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [order] = await db.update(ordersTable).set({
    status: parsed.data.status as "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
    trackingNumber: parsed.data.trackingNumber ?? null,
    notes: parsed.data.notes ?? null,
  }).where(eq(ordersTable.id, params.data.id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const notifType = parsed.data.status === "shipped" ? "order_shipped" : parsed.data.status === "delivered" ? "order_delivered" : "system";
  await db.insert(notificationsTable).values({
    userId: order.userId,
    type: notifType as "order_shipped" | "order_delivered" | "system",
    title: `Order #${order.id} ${parsed.data.status}`,
    message: `Your order status has been updated to ${parsed.data.status}`,
    metadata: { orderId: order.id },
  });

  const response = await buildOrderResponse(order);
  emitToUser(order.userId, "order:updated", response);
  res.json(response);
});

export default router;
