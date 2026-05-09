import { Router, IRouter } from "express";
import { db, cartsTable, cartItemsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
import { AddCartItemBody, UpdateCartItemParams, UpdateCartItemBody, RemoveCartItemParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateCart(userId: number) {
  let [cart] = await db.select().from(cartsTable).where(eq(cartsTable.userId, userId));
  if (!cart) {
    [cart] = await db.insert(cartsTable).values({ userId }).returning();
  }
  return cart;
}

async function buildCartResponse(userId: number) {
  const cart = await getOrCreateCart(userId);
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
  const enriched = await Promise.all(
    items.map(async (item) => {
      const [p] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
      const price = p ? Number(p.price) : 0;
      return {
        productId: item.productId,
        productName: p?.name ?? "Unknown",
        price,
        quantity: item.quantity,
        imageUrl: p?.imageUrl ?? null,
        subtotal: price * item.quantity,
      };
    })
  );
  const total = enriched.reduce((acc, i) => acc + i.subtotal, 0);
  const itemCount = enriched.reduce((acc, i) => acc + i.quantity, 0);
  return { items: enriched, total, itemCount };
}

router.get("/cart", authenticate, async (req, res): Promise<void> => {
  const cart = await buildCartResponse(req.user!.userId);
  res.json(cart);
});

router.post("/cart/items", authenticate, async (req, res): Promise<void> => {
  const parsed = AddCartItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cart = await getOrCreateCart(req.user!.userId);
  const [existing] = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, parsed.data.productId)));
  if (existing) {
    await db.update(cartItemsTable).set({ quantity: existing.quantity + parsed.data.quantity })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({ cartId: cart.id, productId: parsed.data.productId, quantity: parsed.data.quantity });
  }
  res.status(201).json(await buildCartResponse(req.user!.userId));
});

router.patch("/cart/items/:productId", authenticate, async (req, res): Promise<void> => {
  const params = UpdateCartItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid productId" }); return; }
  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cart = await getOrCreateCart(req.user!.userId);
  if (parsed.data.quantity <= 0) {
    await db.delete(cartItemsTable).where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, params.data.productId)));
  } else {
    await db.update(cartItemsTable).set({ quantity: parsed.data.quantity })
      .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, params.data.productId)));
  }
  res.json(await buildCartResponse(req.user!.userId));
});

router.delete("/cart/items/:productId", authenticate, async (req, res): Promise<void> => {
  const params = RemoveCartItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid productId" }); return; }
  const cart = await getOrCreateCart(req.user!.userId);
  await db.delete(cartItemsTable).where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, params.data.productId)));
  res.json(await buildCartResponse(req.user!.userId));
});

router.delete("/cart", authenticate, async (req, res): Promise<void> => {
  const cart = await getOrCreateCart(req.user!.userId);
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
  res.sendStatus(204);
});

export default router;
