import { Router, IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
import { MarkNotificationReadParams, ListNotificationsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notifications", authenticate, async (req, res): Promise<void> => {
  const q = ListNotificationsQueryParams.safeParse(req.query);
  const conditions = [eq(notificationsTable.userId, req.user!.userId)];
  if (q.success && q.data.unreadOnly) conditions.push(eq(notificationsTable.isRead, false));
  const rows = await db.select().from(notificationsTable)
    .where(and(...conditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(rows.map((n) => ({ ...n, metadata: n.metadata ?? {} })));
});

router.patch("/notifications/:id/read", authenticate, async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [notif] = await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.id, params.data.id), eq(notificationsTable.userId, req.user!.userId)))
    .returning();
  if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json({ ...notif, metadata: notif.metadata ?? {} });
});

router.patch("/notifications/read-all", authenticate, async (req, res): Promise<void> => {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.user!.userId));
  res.sendStatus(204);
});

export default router;
