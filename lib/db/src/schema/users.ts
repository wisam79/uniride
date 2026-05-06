import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const institutionsTable = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").unique(),
  gender: text("gender", { enum: ["male", "female"] }),
  role: text("role", { enum: ["student", "driver", "admin", "unassigned"] }).notNull().default("unassigned"),
  institutionId: uuid("institution_id").references(() => institutionsTable.id),
  isActivated: boolean("is_activated").default(false).notNull(),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, createdAt: true, updatedAt: true, isDeleted: true });
export const selectProfileSchema = createSelectSchema(profilesTable);
export type InsertProfile = typeof profilesTable.$inferInsert;
export type Profile = typeof profilesTable.$inferSelect;
