import { pgTable, uuid, text, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { profilesTable } from "./users";
import { driversTable } from "./drivers";
import { institutionsTable } from "./users";

export const studentPreferencesTable = pgTable("student_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().unique().references(() => profilesTable.id, { onDelete: "cascade" }),
  institutionId: uuid("institution_id").notNull().references(() => institutionsTable.id),
  goTime: text("go_time").notNull(),
  returnTime: text("return_time").notNull(),
  pickupArea: text("pickup_area"),
  dropoffArea: text("dropoff_area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionRequestsTable = pgTable("subscription_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  driverId: uuid("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  institutionId: uuid("institution_id").notNull().references(() => institutionsTable.id),
  goTime: text("go_time").notNull(),
  returnTime: text("return_time").notNull(),
  pickupArea: text("pickup_area"),
  dropoffArea: text("dropoff_area"),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).notNull().default("pending"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  driverId: uuid("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  driverName: text("driver_name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  monthlyFee: integer("monthly_fee").notNull(),
  commissionBps: integer("commission_bps").notNull().default(1500),
  commissionAmount: integer("commission_amount").notNull().default(0),
  driverPayout: integer("driver_payout").notNull().default(0),
  paymentStatus: text("payment_status", { enum: ["pending", "paid", "failed", "refunded"] }).notNull().default("pending"),
  tripsUsed: integer("trips_used").notNull().default(0),
  tripsPerMonth: integer("trips_per_month").notNull().default(44),
  status: text("status", { enum: ["pending", "active", "cancelled", "expired"] }).notNull().default("pending"),
  activationCode: text("activation_code").unique(),
  idempotencyKey: text("idempotency_key").unique(),
  cancelledAt: timestamp("cancelled_at"),
  refundAmount: integer("refund_amount"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionRequestSchema = createInsertSchema(subscriptionRequestsTable).omit({ id: true, respondedAt: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true, isDeleted: true });
export type SubscriptionRequest = typeof subscriptionRequestsTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
