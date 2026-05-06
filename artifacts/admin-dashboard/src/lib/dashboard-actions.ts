'use server';

import { db } from '@workspace/db';
import { profilesTable, driversTable, routesTable, subscriptionsTable, tripsTable } from '@workspace/db/schema';
import { eq, sql, count as drizzleCount, sum } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface DashboardStats {
  totalStudents: number;
  totalDrivers: number;
  activeSubscriptions: number;
  totalTrips: number;
  totalRevenue: number;
  totalCommission: number;
  monthlyStats: { month: string; subscriptions: number; revenue: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [studentCount] = await db
    .select({ count: drizzleCount() })
    .from(profilesTable)
    .where(eq(profilesTable.role, 'student'));

  const [driverCount] = await db
    .select({ count: drizzleCount() })
    .from(profilesTable)
    .where(eq(profilesTable.role, 'driver'));

  const [activeSubCount] = await db
    .select({ count: drizzleCount() })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.status, 'active'));

  const [tripCount] = await db
    .select({ count: drizzleCount() })
    .from(tripsTable);

  const [revenueResult] = await db
    .select({ total: sum(subscriptionsTable.monthlyFee) })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.paymentStatus, 'paid'));

  const [commissionResult] = await db
    .select({ total: sum(subscriptionsTable.commissionAmount) })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.paymentStatus, 'paid'));

  return {
    totalStudents: Number(studentCount?.count ?? 0),
    totalDrivers: Number(driverCount?.count ?? 0),
    activeSubscriptions: Number(activeSubCount?.count ?? 0),
    totalTrips: Number(tripCount?.count ?? 0),
    totalRevenue: Number(revenueResult?.total ?? 0),
    totalCommission: Number(commissionResult?.total ?? 0),
    monthlyStats: [],
  };
}

export async function getRecentTrips(limit = 10) {
  return db.select().from(tripsTable).orderBy(sql`created_at DESC`).limit(limit);
}