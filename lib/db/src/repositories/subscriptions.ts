import { db } from "../index";
import { subscriptionsTable } from "../schema/subscriptions";
import { profilesTable } from "../schema/users";
import { driversTable } from "../schema/drivers";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Subscription } from "../schema/subscriptions";

export interface SubscriptionWithRelations extends Subscription {
  studentName?: string | null;
  driverVehicle?: string | null;
}

export const subscriptionRepository = {
  async findAll(limit = 50, offset = 0): Promise<SubscriptionWithRelations[]> {
    const results = await db.select()
      .from(subscriptionsTable)
      .leftJoin(profilesTable, eq(subscriptionsTable.studentId, profilesTable.id))
      .leftJoin(driversTable, eq(subscriptionsTable.driverId, driversTable.id))
      .where(eq(subscriptionsTable.isDeleted, false))
      .orderBy(desc(subscriptionsTable.createdAt))
      .limit(limit).offset(offset);

    return results.map(r => ({
      ...r.subscriptions,
      studentName: r.profiles?.fullName ?? null,
      driverVehicle: r.drivers?.vehicleInfo ?? null,
    }));
  },

  async findById(id: string): Promise<Subscription | undefined> {
    const [result] = await db.select().from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.isDeleted, false)));
    return result;
  },

  async findByStudent(studentId: string): Promise<SubscriptionWithRelations[]> {
    const results = await db.select()
      .from(subscriptionsTable)
      .leftJoin(driversTable, eq(subscriptionsTable.driverId, driversTable.id))
      .where(and(
        eq(subscriptionsTable.studentId, studentId),
        eq(subscriptionsTable.isDeleted, false)
      ))
      .orderBy(desc(subscriptionsTable.createdAt));

    return results.map(r => ({
      ...r.subscriptions,
      driverVehicle: r.drivers?.vehicleInfo ?? null,
    }));
  },

  async findByDriver(driverId: string): Promise<SubscriptionWithRelations[]> {
    const results = await db.select()
      .from(subscriptionsTable)
      .leftJoin(profilesTable, eq(subscriptionsTable.studentId, profilesTable.id))
      .where(and(
        eq(subscriptionsTable.driverId, driverId),
        eq(subscriptionsTable.isDeleted, false)
      ))
      .orderBy(desc(subscriptionsTable.createdAt));

    return results.map(r => ({
      ...r.subscriptions,
      studentName: r.profiles?.fullName ?? null,
    }));
  },

  async findByStatus(status: Subscription["status"]): Promise<Subscription[]> {
    return db.select().from(subscriptionsTable)
      .where(and(
        eq(subscriptionsTable.status, status),
        eq(subscriptionsTable.isDeleted, false)
      ))
      .orderBy(desc(subscriptionsTable.createdAt));
  },

  async create(data: typeof subscriptionsTable.$inferInsert): Promise<Subscription> {
    const [result] = await db.insert(subscriptionsTable).values(data).returning();
    return result;
  },

  async update(id: string, data: Partial<typeof subscriptionsTable.$inferInsert>): Promise<Subscription> {
    const [result] = await db.update(subscriptionsTable)
      .set(data)
      .where(eq(subscriptionsTable.id, id))
      .returning();
    return result;
  },

  async softDelete(id: string): Promise<void> {
    await db.update(subscriptionsTable)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, id));
  },

  async cancel(id: string): Promise<void> {
    await db.update(subscriptionsTable)
      .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, id));
  },

  async findAllFiltered({
    limit = 50,
    offset = 0,
    status,
    paymentStatus,
  }: {
    limit?: number;
    offset?: number;
    status?: Subscription["status"] | 'all' | string;
    paymentStatus?: Subscription["paymentStatus"] | 'all' | string;
  }): Promise<SubscriptionWithRelations[]> {
    const conditions = [eq(subscriptionsTable.isDeleted, false)];

    if (status && status !== 'all') {
      conditions.push(eq(subscriptionsTable.status, status as Subscription["status"]));
    }
    if (paymentStatus && paymentStatus !== 'all') {
      conditions.push(eq(subscriptionsTable.paymentStatus, paymentStatus as Subscription["paymentStatus"]));
    }

    const results = await db.select()
      .from(subscriptionsTable)
      .leftJoin(profilesTable, eq(subscriptionsTable.studentId, profilesTable.id))
      .leftJoin(driversTable, eq(subscriptionsTable.driverId, driversTable.id))
      .where(and(...conditions))
      .orderBy(desc(subscriptionsTable.createdAt))
      .limit(limit).offset(offset);

    return results.map(r => ({
      ...r.subscriptions,
      studentName: r.profiles?.fullName ?? null,
      driverVehicle: r.drivers?.vehicleInfo ?? null,
    }));
  },

  async countFiltered({
    status,
    paymentStatus,
  }: {
    status?: Subscription["status"] | "all";
    paymentStatus?: Subscription["paymentStatus"] | "all";
  }): Promise<number> {
    const conditions = [eq(subscriptionsTable.isDeleted, false)];

    if (status && status !== 'all') {
      conditions.push(eq(subscriptionsTable.status, status as Subscription["status"]));
    }
    if (paymentStatus && paymentStatus !== 'all') {
      conditions.push(eq(subscriptionsTable.paymentStatus, paymentStatus as Subscription["paymentStatus"]));
    }

    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(subscriptionsTable)
      .where(and(...conditions));
    return Number(result?.count ?? 0);
  },

  async count(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.isDeleted, false));
    return Number(result?.count ?? 0);
  },
};