import { pgTable, uuid, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const routesTable = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").notNull().references(() => usersTable.id),
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone").notNull(),
  vehicleType: text("vehicle_type"),
  vehiclePlate: text("vehicle_plate"),
  vehicleColor: text("vehicle_color"),
  fromArea: text("from_area").notNull(),
  fromCity: text("from_city").default("بغداد").notNull(),
  toUniversity: text("to_university").notNull(),
  departureMorning: text("departure_morning").notNull(),
  departureEvening: text("departure_evening").notNull(),
  totalSeats: integer("total_seats").default(4).notNull(),
  availableSeats: integer("available_seats").default(4).notNull(),
  monthlyFare: numeric("monthly_fare", { precision: 10, scale: 0 }).default("80000").notNull(),
  genderPreference: text("gender_preference", { enum: ["any", "female", "male"] }).default("any").notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("5.0").notNull(),
  totalStudents: integer("total_students").default(0).notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRouteSchema = createInsertSchema(routesTable).omit({ id: true, createdAt: true });
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routesTable.$inferSelect;
