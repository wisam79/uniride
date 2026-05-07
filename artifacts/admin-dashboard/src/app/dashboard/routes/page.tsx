import React from 'react';
import { db } from '@workspace/db';
import { routesTable, driversTable, profilesTable, institutionsTable } from '@workspace/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import RouteForm from './RouteForm';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '@/components/ui';
import { routesSearchParamsCache } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams?: Promise<Record<string, string>>;
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
  const params = routesSearchParamsCache.parse(await searchParams ?? {});
  const page = params.page;
  const limit = params.limit;
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>منطقة الانطلاق</TableHead>
              <TableHead>الجامعة</TableHead>
              <TableHead>السائق</TableHead>
              <TableHead>وقت الذهاب</TableHead>
              <TableHead>وقت العودة</TableHead>
              <TableHead>المقاعد</TableHead>
              <TableHead>الطلاب</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.id}>
                <TableCell>
                  <div className="font-medium text-gray-900">{route.fromArea}</div>
                  <div className="text-xs text-gray-500">{route.fromCity}</div>
                </TableCell>
                <TableCell className="text-gray-700">{route.toUniversity}</TableCell>
                <TableCell>
                  <div className="font-medium text-gray-900">{route.driverName}</div>
                  <div className="text-xs text-gray-500" dir="ltr">
                    {route.driverPhone}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600" dir="ltr">
                  {route.departureMorning}
                </TableCell>
                <TableCell className="text-gray-600" dir="ltr">
                  {route.departureEvening}
                </TableCell>
                <TableCell>
                  <Badge variant={route.availableSeats > 0 ? 'success' : 'destructive'}>
                    {route.availableSeats}/{route.totalSeats}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-700">{route.totalStudents}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <RouteForm drivers={drivers} institutions={institutions} editRoute={route} />
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {routes.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  لا توجد مسارات بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              إجمالي {totalCount} مسار | صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2" dir="ltr">
              <a href={`/dashboard/routes?page=${Math.max(1, page - 1)}&limit=${limit}&search=${params.search}&status=${params.status || ''}&institutionId=${params.institutionId || ''}`}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none text-gray-300 border-gray-200' : ''}
                >
                  السابق
                </Button>
              </a>
              <a href={`/dashboard/routes?page=${Math.min(totalPages, page + 1)}&limit=${limit}&search=${params.search}&status=${params.status || ''}&institutionId=${params.institutionId || ''}`}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  className={
                    page >= totalPages ? 'pointer-events-none text-gray-300 border-gray-200' : ''
                  }
                >
                  التالي
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
