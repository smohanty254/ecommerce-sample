import { Router, IRouter } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { authenticate, optionalAuthenticate } from "../middlewares/auth";
import { ListReviewsQueryParams, CreateReviewBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichReview(r: typeof reviewsTable.$inferSelect) {
  const [u] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, r.userId));
  return {
    id: r.id,
    productId: r.productId,
    userId: r.userId,
    userName: u?.name ?? null,
    userAvatar: u?.avatarUrl ?? null,
    rating: r.rating,
    title: r.title,
    body: r.body,
    isVerified: r.isVerified,
    createdAt: r.createdAt,
  };
}

router.get("/reviews", optionalAuthenticate, async (req, res): Promise<void> => {
  const q = ListReviewsQueryParams.safeParse(req.query);
  const page = q.success ? (q.data.page ?? 1) : 1;
  const limit = q.success ? (q.data.limit ?? 10) : 10;
  const offset = (page - 1) * limit;

  const where = q.success && q.data.productId ? eq(reviewsTable.productId, q.data.productId) : undefined;

  const [countResult, avgResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(reviewsTable).where(where),
    db.select({ avg: sql<number>`avg(rating)::float` }).from(reviewsTable).where(where),
    db.select().from(reviewsTable).where(where).orderBy(desc(reviewsTable.createdAt)).limit(limit).offset(offset),
  ]);

  const data = await Promise.all(rows.map(enrichReview));
  res.json({ data, total: countResult[0]?.count ?? 0, page, limit, averageRating: avgResult[0]?.avg ?? 0 });
});

router.post("/reviews", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [review] = await db.insert(reviewsTable).values({
    productId: parsed.data.productId,
    userId: req.user!.userId,
    rating: parsed.data.rating,
    title: parsed.data.title ?? null,
    body: parsed.data.body ?? null,
    isVerified: false,
  }).returning();
  res.status(201).json(await enrichReview(review));
});

export default router;
