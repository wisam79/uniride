import { pgTable, uuid, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const absencesTable = pgTable("absences", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => usersTable.id),
  studentName: text("student_name").notNull(),
  driverId: uuid("driver_id").notNull().references(() => usersTable.id),
  date: text("date").notNull(),
  reason: text("reason"),
  notifiedAt: timestamp("notified_at").defaultNow().notNull(),
});

export const insertAbsenceSchema = createInsertSchema(absencesTable).omit({ id: true, notifiedAt: true });
export type InsertAbsence = z.infer<typeof insertAbsenceSchema>;
export type Absence = typeof absencesTable.$inferSelect;
