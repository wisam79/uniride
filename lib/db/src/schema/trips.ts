import { pgTable, uuid, text, integer, timestamp, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { driversTable } from "./drivers";
import { subscriptionsTable } from "./subscriptions";
import { profilesTable } from "./users";

export const tripsTable = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id, { onDelete: "set null" }),
  direction: text("direction", { enum: ["go", "return"] }).notNull(),
  tripDate: date("trip_date").notNull().defaultNow(),
  status: text("status", { enum: ["scheduled", "driver_waiting", "in_transit", "completed", "absent", "cancelled"] }).notNull().default("scheduled"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    driverIdIdx: index("idx_trips_driver_id").on(table.driverId),
    statusIdx: index("idx_trips_status").on(table.status),
  };
});

export const tripStudentsTable = pgTable("trip_students", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["waiting", "picked_up", "dropped_off", "absent"] }).notNull().default("waiting"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tripIdIdx: index("idx_trip_students_trip_id").on(table.tripId),
    studentIdIdx: index("idx_trip_students_student_id").on(table.studentId),
  };
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, createdAt: true });
export type Trip = typeof tripsTable.$inferSelect;
export type TripStudent = typeof tripStudentsTable.$inferSelect;
