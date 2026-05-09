import { Router, IRouter } from "express";
import { db, productsTable, categoriesTable, reviewsTable } from "@workspace/db";
import { eq, ilike, sql, and, gte, lte, desc, asc } from "drizzle-orm";
import { authenticate, requireRole, optionalAuthenticate } from "../middlewares/auth";
import {
  GetProductParams, CreateProductBody, UpdateProductParams, UpdateProductBody,
  DeleteProductParams, UpdateProductStockParams, UpdateProductStockBody, ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichProduct(p: typeof productsTable.$inferSelect) {
  const [cat] = await db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, p.categoryId));
  const [stats] = await db
    .select({ avg: sql<number>`avg(rating)::float`, count: sql<number>`count(*)::int` })
    .from(reviewsTable).where(eq(reviewsTable.productId, p.id));
  return {
    ...p,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    categoryName: cat?.name ?? null,
    rating: stats?.avg ? Math.round(stats.avg * 10) / 10 : null,
    reviewCount: stats?.count ?? 0,
  };
}

router.get("/products", optionalAuthenticate, async (req, res): Promise<void> => {
  const q = ListProductsQueryParams.safeParse(req.query);
  const page = q.success ? (q.data.page ?? 1) : 1;
  const limit = q.success ? (q.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (q.success) {
    if (q.data.categoryId) conditions.push(eq(productsTable.categoryId, q.data.categoryId));
    if (q.data.minPrice != null) conditions.push(gte(productsTable.price, String(q.data.minPrice)));
    if (q.data.maxPrice != null) conditions.push(lte(productsTable.price, String(q.data.maxPrice)));
    if (q.data.inStock) conditions.push(gte(productsTable.stock, 1));
    if (q.data.search) conditions.push(ilike(productsTable.name, `%${q.data.search}%`));
  }

  let orderCol: typeof productsTable.createdAt | typeof productsTable.price | typeof productsTable.stock = productsTable.createdAt;
  let orderDir: "asc" | "desc" = "desc";
  if (q.success && q.data.sortBy) {
    if (q.data.sortBy === "price_asc") { orderCol = productsTable.price; orderDir = "asc"; }
    else if (q.data.sortBy === "price_desc") { orderCol = productsTable.price; orderDir = "desc"; }
    else if (q.data.sortBy === "bestseller") { orderCol = productsTable.stock; orderDir = "asc"; }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [total, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(where),
    db.select().from(productsTable).where(where)
      .orderBy(orderDir === "asc" ? asc(orderCol) : desc(orderCol))
      .limit(limit).offset(offset),
  ]);

  const data = await Promise.all(rows.map(enrichProduct));
  res.json({ data, total: total[0]?.count ?? 0, page, limit });
});

router.post("/products", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [p] = await db.insert(productsTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
    compareAtPrice: parsed.data.compareAtPrice ? String(parsed.data.compareAtPrice) : null,
  }).returning();
  res.status(201).json(await enrichProduct(p));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db.select().from(productsTable).where(eq(productsTable.isFeatured, true)).limit(12);
  const data = await Promise.all(rows.map(enrichProduct));
  res.json(data);
});

router.get("/products/trending", async (_req, res): Promise<void> => {
  const rows = await db.select().from(productsTable).orderBy(desc(productsTable.createdAt)).limit(8);
  const data = await Promise.all(rows.map(enrichProduct));
  res.json(data);
});

router.get("/products/:id", optionalAuthenticate, async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!p) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(await enrichProduct(p));
});

router.patch("/products/:id", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price != null) updateData.price = String(parsed.data.price);
  if (parsed.data.compareAtPrice != null) updateData.compareAtPrice = String(parsed.data.compareAtPrice);
  const [p] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, params.data.id)).returning();
  if (!p) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(await enrichProduct(p));
});

router.delete("/products/:id", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/products/:id/stock", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = UpdateProductStockParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = UpdateProductStockBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [p] = await db.update(productsTable).set({ stock: parsed.data.stock }).where(eq(productsTable.id, params.data.id)).returning();
  if (!p) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(await enrichProduct(p));
});

export default router;
