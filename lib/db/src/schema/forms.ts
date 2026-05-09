import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const formSchemasTable = pgTable("form_schemas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull().default([]),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const formSubmissionsTable = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  userId: integer("user_id"),
  data: jsonb("data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFormSchemaSchema = createInsertSchema(formSchemasTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFormSubmissionSchema = createInsertSchema(formSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertFormSchema = z.infer<typeof insertFormSchemaSchema>;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSchemaRow = typeof formSchemasTable.$inferSelect;
export type FormSubmission = typeof formSubmissionsTable.$inferSelect;
