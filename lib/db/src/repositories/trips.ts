import { db } from "../index";
import { tripsTable, tripStudentsTable } from "../schema/trips";
import { profilesTable } from "../schema/users";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Trip, TripStudent } from "../schema/trips";

export interface TripWithStudents extends Trip {
  students?: { studentId: string; status: string; fullName?: string | null }[];
}

export const tripRepository = {
  async findAll(limit = 50, offset = 0): Promise<Trip[]> {
    return db.select().from(tripsTable)
      .orderBy(desc(tripsTable.createdAt))
      .limit(limit).offset(offset);
  },

  async findById(id: string): Promise<Trip | undefined> {
    const [result] = await db.select().from(tripsTable)
      .where(eq(tripsTable.id, id));
    return result;
  },

  async findByDriver(driverId: string): Promise<Trip[]> {
    return db.select().from(tripsTable)
      .where(eq(tripsTable.driverId, driverId))
      .orderBy(desc(tripsTable.createdAt));
  },

  async findByStudent(studentId: string): Promise<Trip[]> {
    const results = await db.select()
      .from(tripStudentsTable)
      .innerJoin(tripsTable, eq(tripStudentsTable.tripId, tripsTable.id))
      .where(eq(tripStudentsTable.studentId, studentId))
      .orderBy(desc(tripsTable.createdAt));

    return results.map(r => r.trips);
  },

  async findWithStudents(id: string): Promise<TripWithStudents | undefined> {
    const [trip] = await db.select().from(tripsTable)
      .where(eq(tripsTable.id, id));

    if (!trip) return undefined;

    const students = await db.select({
      studentId: tripStudentsTable.studentId,
      status: tripStudentsTable.status,
      fullName: profilesTable.fullName,
    })
      .from(tripStudentsTable)
      .leftJoin(profilesTable, eq(tripStudentsTable.studentId, profilesTable.id))
      .where(eq(tripStudentsTable.tripId, id));

    return { ...trip, students };
  },

  async create(data: typeof tripsTable.$inferInsert): Promise<Trip> {
    const [result] = await db.insert(tripsTable).values(data).returning();
    return result;
  },

  async update(id: string, data: Partial<typeof tripsTable.$inferInsert>): Promise<Trip> {
    const [result] = await db.update(tripsTable)
      .set(data)
      .where(eq(tripsTable.id, id))
      .returning();
    return result;
  },

  async getStudentStatus(tripId: string, studentId: string): Promise<TripStudent | undefined> {
    const [result] = await db.select().from(tripStudentsTable)
      .where(and(
        eq(tripStudentsTable.tripId, tripId),
        eq(tripStudentsTable.studentId, studentId)
      ));
    return result;
  },

  async updateStudentStatus(tripId: string, studentId: string, status: TripStudent["status"]): Promise<void> {
    await db.update(tripStudentsTable)
      .set({ status })
      .where(and(
        eq(tripStudentsTable.tripId, tripId),
        eq(tripStudentsTable.studentId, studentId)
      ));
  },

  async count(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(tripsTable);
    return Number(result?.count ?? 0);
  },
};