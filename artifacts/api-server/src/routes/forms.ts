import { Router, IRouter } from "express";
import { db, formSchemasTable, formSubmissionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireRole, optionalAuthenticate } from "../middlewares/auth";
import { GetFormParams, CreateFormBody, UpdateFormParams, UpdateFormBody, DeleteFormParams, ListFormSubmissionsParams, SubmitFormBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichForm(f: typeof formSchemasTable.$inferSelect) {
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(formSubmissionsTable).where(eq(formSubmissionsTable.formId, f.id));
  return { ...f, submissionCount: count?.count ?? 0 };
}

router.get("/forms", authenticate, async (_req, res): Promise<void> => {
  const rows = await db.select().from(formSchemasTable).orderBy(formSchemasTable.createdAt);
  const data = await Promise.all(rows.map(enrichForm));
  res.json(data);
});

router.post("/forms", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = CreateFormBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [form] = await db.insert(formSchemasTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    fields: parsed.data.fields ?? [],
    isPublished: parsed.data.isPublished ?? false,
  }).returning();
  res.status(201).json(await enrichForm(form));
});

router.get("/forms/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetFormParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [form] = await db.select().from(formSchemasTable).where(eq(formSchemasTable.id, params.data.id));
  if (!form) { res.status(404).json({ error: "Form not found" }); return; }
  res.json(await enrichForm(form));
});

router.patch("/forms/:id", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = UpdateFormParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = UpdateFormBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description != null) updateData.description = parsed.data.description;
  if (parsed.data.fields != null) updateData.fields = parsed.data.fields;
  if (parsed.data.isPublished != null) updateData.isPublished = parsed.data.isPublished;
  const [form] = await db.update(formSchemasTable).set(updateData).where(eq(formSchemasTable.id, params.data.id)).returning();
  if (!form) { res.status(404).json({ error: "Form not found" }); return; }
  res.json(await enrichForm(form));
});

router.delete("/forms/:id", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteFormParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(formSubmissionsTable).where(eq(formSubmissionsTable.formId, params.data.id));
  await db.delete(formSchemasTable).where(eq(formSchemasTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/forms/:id/submissions", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = ListFormSubmissionsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const rows = await db.select().from(formSubmissionsTable).where(eq(formSubmissionsTable.formId, params.data.id));
  res.json(rows);
});

router.post("/forms/:id/submissions", optionalAuthenticate, async (req, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw, 10);
  const parsed = SubmitFormBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [submission] = await db.insert(formSubmissionsTable).values({
    formId: id,
    userId: req.user?.userId ?? null,
    data: parsed.data.data,
  }).returning();
  res.status(201).json(submission);
});

export default router;
