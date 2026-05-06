import { db } from "../index";
import { driversTable } from "../schema/drivers";
import { profilesTable } from "../schema/users";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Driver, InsertDriver } from "../schema/drivers";

export interface DriverWithProfile extends Driver {
  profile?: {
    id: string;
    fullName: string;
    phone: string | null;
  };
}

export const driverRepository = {
  async findAll(): Promise<Driver[]> {
    return db.select().from(driversTable)
      .where(eq(driversTable.isDeleted, false))
      .orderBy(desc(driversTable.createdAt));
  },

  async findById(id: string): Promise<Driver | undefined> {
    const [result] = await db.select().from(driversTable)
      .where(and(eq(driversTable.id, id), eq(driversTable.isDeleted, false)));
    return result;
  },

  async findByUserId(userId: string): Promise<Driver | undefined> {
    const [result] = await db.select().from(driversTable)
      .where(and(eq(driversTable.userId, userId), eq(driversTable.isDeleted, false)));
    return result;
  },

  async findAvailable(): Promise<Driver[]> {
    return db.select().from(driversTable)
      .where(and(
        eq(driversTable.isAvailable, true),
        eq(driversTable.isDeleted, false)
      ));
  },

  async findAllWithProfiles(): Promise<DriverWithProfile[]> {
    const results = await db.select()
      .from(driversTable)
      .innerJoin(profilesTable, eq(driversTable.userId, profilesTable.id))
      .where(eq(driversTable.isDeleted, false))
      .orderBy(desc(driversTable.createdAt));

    return results.map(r => ({
      ...r.drivers,
      profile: {
        id: r.profiles.id,
        fullName: r.profiles.fullName,
        phone: r.profiles.phone,
      },
    }));
  },

  async create(data: InsertDriver): Promise<Driver> {
    const [result] = await db.insert(driversTable).values(data).returning();
    return result;
  },

  async update(id: string, data: Partial<InsertDriver>): Promise<Driver> {
    const [result] = await db.update(driversTable)
      .set(data)
      .where(eq(driversTable.id, id))
      .returning();
    return result;
  },

  async softDelete(id: string): Promise<void> {
    await db.update(driversTable)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(driversTable.id, id));
  },

  async decrementSeats(id: string): Promise<Driver | undefined> {
    const [result] = await db.update(driversTable)
      .set({ availableSeats: sql`available_seats - 1` })
      .where(and(eq(driversTable.id, id), sql`available_seats > 0`))
      .returning();
    return result;
  },

  async count(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(driversTable)
      .where(eq(driversTable.isDeleted, false));
    return Number(result?.count ?? 0);
  },
};