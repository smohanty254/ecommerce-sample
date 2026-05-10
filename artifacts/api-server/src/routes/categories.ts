import { Router, IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { GetCategoryParams, CreateCategoryBody, UpdateCategoryParams, UpdateCategoryBody, DeleteCategoryParams } from "@workspace/api-zod";
import { withCache, invalidateTags } from "../lib/cache";

const router: IRouter = Router();

router.get(
  "/categories",
  withCache({
    key: () => "categories:list",
    ttl: 600,
    tags: ["categories"],
  }),
  async (_req, res): Promise<void> => {
    const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
    const counts = await db
      .select({ categoryId: productsTable.categoryId, count: sql<number>`count(*)::int` })
      .from(productsTable)
      .groupBy(productsTable.categoryId);
    const countMap = new Map(counts.map((c) => [c.categoryId, c.count]));
    res.json(rows.map((c) => ({ ...c, productCount: countMap.get(c.id) ?? 0 })));
  },
);

router.post("/categories", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [cat] = await db.insert(categoriesTable).values(parsed.data).returning();
  await invalidateTags(["categories"]);
  res.status(201).json({ ...cat, productCount: 0 });
});

router.get(
  "/categories/:id",
  withCache({
    key: (req) => `categories:${req.params.id}`,
    ttl: 600,
    tags: ["categories"],
  }),
  async (req, res): Promise<void> => {
    const params = GetCategoryParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, params.data.id));
    if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
    const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, cat.id));
    res.json({ ...cat, productCount: count?.count ?? 0 });
  },
);

router.patch("/categories/:id", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [cat] = await db.update(categoriesTable).set(parsed.data).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  await invalidateTags(["categories"]);
  res.json({ ...cat, productCount: 0 });
});

router.delete("/categories/:id", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id));
  await invalidateTags(["categories"]);
  res.sendStatus(204);
});

export default router;
