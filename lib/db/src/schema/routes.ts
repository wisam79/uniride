import { pgTable, uuid, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { driversTable } from "./drivers";
import { institutionsTable } from "./users";
import { profilesTable } from "./users";

export const routesTable = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  fromArea: text("from_area").notNull(),
  fromCity: text("from_city").default("بغداد").notNull(),
  toUniversity: text("to_university").notNull(),
  institutionId: uuid("institution_id").references(() => institutionsTable.id),
  departureMorning: text("departure_morning").notNull(),
  departureEvening: text("departure_evening").notNull(),
  totalSeats: integer("total_seats").default(4).notNull(),
  availableSeats: integer("available_seats").default(4).notNull(),
  monthlyFare: integer("monthly_fare").default(90000).notNull(),
  genderPreference: text("gender_preference", { enum: ["any", "female", "male"] }).default("any").notNull(),
  rating: integer("rating_bps").default(5000).notNull(),
  totalStudents: integer("total_students").default(0).notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRouteSchema = createInsertSchema(routesTable).omit({ id: true, createdAt: true, isDeleted: true });
export type InsertRoute = typeof routesTable.$inferInsert;
export type Route = typeof routesTable.$inferSelect;
