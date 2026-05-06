import React from 'react';
import { db } from '@workspace/db';
import { routesTable, driversTable, profilesTable, institutionsTable } from '@workspace/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import RouteForm from './RouteForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams?: Promise<{ page?: string; limit?: string }>;
}

async function fetchRoutes(limit: number, offset: number) {
  const rows = await db
    .select({
      id: routesTable.id,
      driverId: routesTable.driverId,
      driverName: profilesTable.fullName,
      driverPhone: profilesTable.phone,
      fromArea: routesTable.fromArea,
      fromCity: routesTable.fromCity,
      toUniversity: routesTable.toUniversity,
      departureMorning: routesTable.departureMorning,
      departureEvening: routesTable.departureEvening,
      totalSeats: routesTable.totalSeats,
      availableSeats: routesTable.availableSeats,
      monthlyFare: routesTable.monthlyFare,
      genderPreference: routesTable.genderPreference,
      totalStudents: routesTable.totalStudents,
      isActive: routesTable.isActive,
      createdAt: routesTable.createdAt,
      institutionId: routesTable.institutionId,
      notes: routesTable.notes,
    })
    .from(routesTable)
    .innerJoin(driversTable, eq(routesTable.driverId, driversTable.id))
    .innerJoin(profilesTable, eq(driversTable.userId, profilesTable.id))
    .where(eq(routesTable.isDeleted, false))
    .orderBy(desc(routesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(routesTable)
    .where(eq(routesTable.isDeleted, false));

  return { rows, totalCount: Number(countResult?.count ?? 0) };
}

async function fetchDrivers() {
  return db
    .select({
      id: driversTable.id,
      fullName: profilesTable.fullName,
      phone: profilesTable.phone,
    })
    .from(driversTable)
    .innerJoin(profilesTable, eq(driversTable.userId, profilesTable.id))
    .where(eq(driversTable.isDeleted, false));
}

async function fetchInstitutions() {
  return db.select().from(institutionsTable);
}

export default async function RoutesPage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const page = Math.max(1, parseInt((params as any).page || '1'));
  const limit = Math.min(100, Math.max(10, parseInt((params as any).limit || '20')));
  const offset = (page - 1) * limit;

  const [{ rows: routes, totalCount }, drivers, institutions] = await Promise.all([
    fetchRoutes(limit, offset),
    fetchDrivers(),
    fetchInstitutions(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const genderLabel: Record<string, string> = {
    any: 'الكل',
    female: 'إناث',
    male: 'ذكور',
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">إدارة المسارات</h3>
        <RouteForm drivers={drivers} institutions={institutions} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">منطقة الانطلاق</th>
                <th className="px-6 py-4 font-medium">الجامعة</th>
                <th className="px-6 py-4 font-medium">السائق</th>
                <th className="px-6 py-4 font-medium">وقت الذهاب</th>
                <th className="px-6 py-4 font-medium">وقت العودة</th>
                <th className="px-6 py-4 font-medium">المقاعد</th>
                <th className="px-6 py-4 font-medium">الطلاب</th>
                <th className="px-6 py-4 font-medium">الحالة</th>
                <th className="px-6 py-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {routes.map((route) => (
                <tr key={route.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{route.fromArea}</div>
                    <div className="text-xs text-gray-500">{route.fromCity}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{route.toUniversity}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{route.driverName}</div>
                    <div className="text-xs text-gray-500" dir="ltr">{route.driverPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600" dir="ltr">{route.departureMorning}</td>
                  <td className="px-6 py-4 text-gray-600" dir="ltr">{route.departureEvening}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      route.availableSeats > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {route.availableSeats}/{route.totalSeats}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{route.totalStudents}</td>
                  <td className="px-6 py-4">
                    {route.isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        غير نشط
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <RouteForm
                        drivers={drivers}
                        institutions={institutions}
                        editRoute={route}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {routes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    لا توجد مسارات بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              إجمالي {totalCount} مسار | صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2" dir="ltr">
              <a
                href={`/dashboard/routes?page=${Math.max(1, page - 1)}&limit=${limit}`}
                className={`px-3 py-1 text-sm rounded border ${
                  page <= 1
                    ? 'text-gray-300 border-gray-200 pointer-events-none'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
                aria-disabled={page <= 1}
              >
                السابق
              </a>
              <a
                href={`/dashboard/routes?page=${Math.min(totalPages, page + 1)}&limit=${limit}`}
                className={`px-3 py-1 text-sm rounded border ${
                  page >= totalPages
                    ? 'text-gray-300 border-gray-200 pointer-events-none'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
                aria-disabled={page >= totalPages}
              >
                التالي
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}