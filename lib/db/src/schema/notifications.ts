import { pgTable, text, serial, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationTypeEnum = pgEnum("notification_type", [
  "order_placed",
  "order_shipped",
  "order_delivered",
  "low_stock",
  "new_review",
  "system",
]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: notificationTypeEnum("type").notNull().default("system"),
  title: text("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").notNull().default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
