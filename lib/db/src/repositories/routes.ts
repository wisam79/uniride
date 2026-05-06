import { db } from "../index";
import { routesTable } from "../schema/routes";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import type { Route, InsertRoute } from "../schema/routes";

export const routeRepository = {
  async findAll(limit = 50, offset = 0): Promise<Route[]> {
    return db.select().from(routesTable)
      .where(eq(routesTable.isDeleted, false))
      .orderBy(desc(routesTable.createdAt))
      .limit(limit).offset(offset);
  },

  async findById(id: string): Promise<Route | undefined> {
    const [result] = await db.select().from(routesTable)
      .where(and(eq(routesTable.id, id), eq(routesTable.isDeleted, false)));
    return result;
  },

  async findByDriver(driverId: string): Promise<Route[]> {
    return db.select().from(routesTable)
      .where(and(
        eq(routesTable.driverId, driverId),
        eq(routesTable.isDeleted, false)
      ))
      .orderBy(desc(routesTable.createdAt));
  },

  async findAvailable(institutionId?: string): Promise<Route[]> {
    const conditions = [
      eq(routesTable.isActive, true),
      eq(routesTable.isDeleted, false),
      gt(routesTable.availableSeats, 0),
    ];

    if (institutionId) {
      conditions.push(eq(routesTable.institutionId, institutionId));
    }

    return db.select().from(routesTable)
      .where(and(...conditions))
      .orderBy(desc(routesTable.createdAt));
  },

  async create(data: InsertRoute): Promise<Route> {
    const [result] = await db.insert(routesTable).values(data).returning();
    return result;
  },

  async update(id: string, data: Partial<InsertRoute>): Promise<Route> {
    const [result] = await db.update(routesTable)
      .set(data)
      .where(eq(routesTable.id, id))
      .returning();
    return result;
  },

  async softDelete(id: string): Promise<void> {
    await db.update(routesTable)
      .set({ isDeleted: true })
      .where(eq(routesTable.id, id));
  },

  async decrementSeats(id: string): Promise<Route | undefined> {
    const [result] = await db.update(routesTable)
      .set({
        availableSeats: sql`available_seats - 1`,
        totalStudents: sql`total_students + 1`,
      })
      .where(and(eq(routesTable.id, id), sql`available_seats > 0`))
      .returning();
    return result;
  },

  async count(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(routesTable)
      .where(eq(routesTable.isDeleted, false));
    return Number(result?.count ?? 0);
  },
};