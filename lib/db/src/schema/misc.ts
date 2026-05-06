import { pgTable, uuid, text, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { driversTable } from "./drivers";
import { profilesTable } from "./users";
import { subscriptionsTable } from "./subscriptions";

export const driverAbsencesTable = pgTable("driver_absences", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  absenceDate: date("absence_date").notNull(),
  deductedAmount: integer("deducted_amount").notNull().default(0),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cardsTable = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  monthlyFee: integer("monthly_fee").notNull(),
  commissionBps: integer("commission_bps").notNull().default(1500),
  isUsed: boolean("is_used").default(false).notNull(),
  usedBy: uuid("used_by").references(() => profilesTable.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at"),
  batchId: text("batch_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodesTable = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviewsTable = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: uuid("from_user_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id, { onDelete: "cascade" }),
  rating: integer("rating"),
  comment: text("comment"),
  isComplaint: boolean("is_complaint").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "request_received", "request_accepted", "request_rejected",
      "subscription_activated", "subscription_expired", "subscription_cancelled",
      "driver_at_capacity", "trip_started", "trip_ended",
      "payment_confirmed", "driver_absent", "new_review",
    ],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  data: text("data"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDriverAbsenceSchema = createInsertSchema(driverAbsencesTable).omit({ id: true, createdAt: true });
export const insertCardSchema = createInsertSchema(cardsTable).omit({ id: true, createdAt: true });
export const insertOtpSchema = createInsertSchema(otpCodesTable).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });

export type DriverAbsence = typeof driverAbsencesTable.$inferSelect;
export type ActivationCode = typeof cardsTable.$inferSelect;
export type OtpCode = typeof otpCodesTable.$inferSelect;
export type Review = typeof reviewsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
