import { Router, IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, sql, or } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { GetUserParams, UpdateUserParams, UpdateUserBody, DeleteUserParams, UpdateUserRoleParams, UpdateUserRoleBody, ListUsersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function mapUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role,
    avatarUrl: u.avatarUrl, phone: u.phone, address: u.address,
    provider: u.provider, isActive: u.isActive,
    createdAt: u.createdAt, updatedAt: u.updatedAt,
  };
}

router.get("/users", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const q = ListUsersQueryParams.safeParse(req.query);
  const page = q.success ? (q.data.page ?? 1) : 1;
  const limit = q.success ? (q.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  let query = db.select().from(usersTable).$dynamic();
  if (q.success && q.data.search) {
    const search = `%${q.data.search}%`;
    query = query.where(or(ilike(usersTable.name, search), ilike(usersTable.email, search)));
  }

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    query.limit(limit).offset(offset),
  ]);

  res.json({ data: data.map(mapUser), total: countResult[0]?.count ?? 0, page, limit });
});

router.get("/users/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(mapUser(user));
});

router.patch("/users/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  if (req.user!.userId !== params.data.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(mapUser(user));
});

router.delete("/users/:id", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/users/:id/role", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateUserRoleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.update(usersTable).set({ role: parsed.data.role as "admin" | "manager" | "customer" }).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(mapUser(user));
});

export default router;
