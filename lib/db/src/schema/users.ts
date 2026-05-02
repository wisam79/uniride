import { pgTable, uuid, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  role: text("role", { enum: ["student", "driver"] }).notNull(),
  university: text("university"),
  vehicleType: text("vehicle_type"),
  vehiclePlate: text("vehicle_plate"),
  vehicleColor: text("vehicle_color"),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("5.0").notNull(),
  totalTrips: integer("total_trips").default(0).notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  balance: numeric("balance", { precision: 12, scale: 0 }).default("0").notNull(),
  basicFare: integer("basic_fare").default(50000).notNull(),
  standardFare: integer("standard_fare").default(80000).notNull(),
  premiumFare: integer("premium_fare").default(120000).notNull(),
  gender: text("gender", { enum: ["male", "female"] }),
  genderPreference: text("gender_preference", { enum: ["any", "female", "male"] }).default("any").notNull(),
  seatsCapacity: integer("seats_capacity").default(4).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, rating: true, totalTrips: true });
export const selectUserSchema = createSelectSchema(usersTable);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
