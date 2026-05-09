import { Router, IRouter } from "express";
import { db, ordersTable, orderItemsTable, productsTable, usersTable, categoriesTable } from "@workspace/db";
import { eq, sql, desc, gte, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { GetSalesChartQueryParams, GetTopProductsQueryParams, GetRecentOrdersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/dashboard", authenticate, requireRole("admin", "manager"), async (_req, res): Promise<void> => {
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)::float` }).from(ordersTable);
  const [orders] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
  const [products] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
  const [customers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "customer"));
  const [pending] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "pending"));
  const [lowStock] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(sql`stock < 10`);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const [recentRevenue] = await db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)::float` }).from(ordersTable).where(gte(ordersTable.createdAt, thirtyDaysAgo));
  const [prevRevenue] = await db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)::float` }).from(ordersTable).where(and(gte(ordersTable.createdAt, sixtyDaysAgo), sql`created_at < ${thirtyDaysAgo.toISOString()}`));
  const [recentOrders] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(gte(ordersTable.createdAt, thirtyDaysAgo));
  const [prevOrders] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(and(gte(ordersTable.createdAt, sixtyDaysAgo), sql`created_at < ${thirtyDaysAgo.toISOString()}`));

  const revenueGrowth = (prevRevenue?.total ?? 0) > 0 ? (((recentRevenue?.total ?? 0) - (prevRevenue?.total ?? 0)) / (prevRevenue?.total ?? 1)) * 100 : 0;
  const ordersGrowth = (prevOrders?.count ?? 0) > 0 ? (((recentOrders?.count ?? 0) - (prevOrders?.count ?? 0)) / (prevOrders?.count ?? 1)) * 100 : 0;
  const totalCount = orders?.count ?? 0;
  const totalRev = revenue?.total ?? 0;
  const avgOrderValue = totalCount > 0 ? totalRev / totalCount : 0;

  res.json({
    totalRevenue: totalRev,
    totalOrders: totalCount,
    totalProducts: products?.count ?? 0,
    totalCustomers: customers?.count ?? 0,
    pendingOrders: pending?.count ?? 0,
    lowStockProducts: lowStock?.count ?? 0,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    ordersGrowth: Math.round(ordersGrowth * 10) / 10,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
  });
});

router.get("/analytics/sales", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const q = GetSalesChartQueryParams.safeParse(req.query);
  const period = q.success ? (q.data.period ?? "30d") : "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db.select({
    date: sql<string>`to_char(created_at, 'YYYY-MM-DD')`,
    revenue: sql<number>`coalesce(sum(total::numeric), 0)::float`,
    orders: sql<number>`count(*)::int`,
  }).from(ordersTable)
    .where(gte(ordersTable.createdAt, since))
    .groupBy(sql`to_char(created_at, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(created_at, 'YYYY-MM-DD')`);

  res.json(rows);
});

router.get("/analytics/top-products", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const q = GetTopProductsQueryParams.safeParse(req.query);
  const limit = q.success ? (q.data.limit ?? 10) : 10;
  const rows = await db.select({
    productId: orderItemsTable.productId,
    productName: orderItemsTable.productName,
    totalSold: sql<number>`sum(order_items.quantity)::int`,
    revenue: sql<number>`sum(order_items.price::numeric * order_items.quantity)::float`,
    imageUrl: productsTable.imageUrl,
  }).from(orderItemsTable)
    .leftJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
    .groupBy(orderItemsTable.productId, orderItemsTable.productName, productsTable.imageUrl)
    .orderBy(desc(sql`sum(order_items.quantity)`))
    .limit(limit);

  res.json(rows);
});

router.get("/analytics/recent-orders", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const q = GetRecentOrdersQueryParams.safeParse(req.query);
  const limit = q.success ? (q.data.limit ?? 10) : 10;
  const rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(limit);
  const data = await Promise.all(rows.map(async (order) => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    return {
      id: order.id, userId: order.userId, userName: null, status: order.status,
      total: Number(order.total), shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod, trackingNumber: order.trackingNumber,
      notes: order.notes, createdAt: order.createdAt, updatedAt: order.updatedAt,
      items: items.map((i) => ({
        productId: i.productId, productName: i.productName,
        price: Number(i.price), quantity: i.quantity,
        subtotal: Number(i.price) * i.quantity, imageUrl: i.imageUrl,
      })),
    };
  }));
  res.json(data);
});

router.get("/analytics/revenue-by-category", authenticate, requireRole("admin", "manager"), async (_req, res): Promise<void> => {
  const rows = await db.select({
    categoryId: productsTable.categoryId,
    categoryName: categoriesTable.name,
    revenue: sql<number>`coalesce(sum(order_items.price::numeric * order_items.quantity), 0)::float`,
  }).from(orderItemsTable)
    .leftJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .groupBy(productsTable.categoryId, categoriesTable.name)
    .orderBy(desc(sql`sum(order_items.price::numeric * order_items.quantity)`));

  const total = rows.reduce((acc, r) => acc + (r.revenue ?? 0), 0);
  const enriched = rows.map((r) => ({
    categoryId: r.categoryId ?? 0,
    categoryName: r.categoryName ?? "Unknown",
    revenue: r.revenue ?? 0,
    percentage: total > 0 ? Math.round(((r.revenue ?? 0) / total) * 1000) / 10 : 0,
  }));

  res.json(enriched);
});

export default router;
