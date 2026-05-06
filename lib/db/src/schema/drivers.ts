import { pgTable, uuid, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { profilesTable } from "./users";
import { institutionsTable } from "./users";

export const driversTable = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => profilesTable.id, { onDelete: "cascade" }),
  vehicleInfo: text("vehicle_info"),
  vehiclePlate: text("vehicle_plate"),
  vehicleColor: text("vehicle_color"),
  capacity: integer("capacity").notNull().default(4),
  availableSeats: integer("available_seats").notNull().default(4), // Primary operational field synced via triggers
  monthlyFee: integer("monthly_fee").notNull().default(90000),
  commissionBps: integer("commission_bps").notNull().default(1500),
  isAvailable: boolean("is_available").default(true).notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  institutionId: uuid("institution_id").references(() => institutionsTable.id),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("idx_drivers_user_id").on(table.userId),
  };
});

export const driverSchedulesTable = pgTable("driver_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  direction: text("direction", { enum: ["go", "return"] }).notNull(),
  departureTime: text("departure_time").notNull(),
  area: text("area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true, updatedAt: true, isDeleted: true });
export type InsertDriver = typeof driversTable.$inferInsert;
export type Driver = typeof driversTable.$inferSelect;
