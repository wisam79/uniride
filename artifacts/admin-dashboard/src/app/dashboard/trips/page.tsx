import React from 'react';
import { db, tripsTable } from '@workspace/db';
import { profilesTable } from '@workspace/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUSES = [
  { value: '', label: 'الكل' },
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'in_transit', label: 'جارية' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'cancelled', label: 'ملغاة' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'مجدولة',
  driver_waiting: 'بانتظار السائق',
  in_transit: 'جارية',
  completed: 'مكتملة',
  absent: 'غائب',
  cancelled: 'ملغاة',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-yellow-100 text-yellow-700',
  driver_waiting: 'bg-orange-100 text-orange-700',
  in_transit: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-600',
};

interface Props {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function TripsPage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const page = Math.max(1, parseInt((params as any).page || '1'));
  const limit = Math.min(100, Math.max(10, parseInt((params as any).limit || '20')));
  const offset = (page - 1) * limit;
  const statusFilter = (params as any).status || '';
  const dateFrom = (params as any).dateFrom || '';
  const dateTo = (params as any).dateTo || '';

  const conditions: ReturnType<typeof eq>[] = [];

  if (statusFilter) {
    conditions.push(eq(tripsTable.status, statusFilter));
  }

  if (dateFrom) {
    conditions.push(gte(tripsTable.tripDate, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(tripsTable.tripDate, dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [tripRows, countResult] = await Promise.all([
    db.select({
      id: tripsTable.id,
      direction: tripsTable.direction,
      tripDate: tripsTable.tripDate,
      status: tripsTable.status,
      startedAt: tripsTable.startedAt,
      endedAt: tripsTable.endedAt,
      createdAt: tripsTable.createdAt,
      driverId: tripsTable.driverId,
      driverFullName: profilesTable.fullName,
      driverPhone: profilesTable.phone,
    })
      .from(tripsTable)
      .leftJoin(profilesTable, eq(tripsTable.driverId, profilesTable.id))
      .where(whereClause)
      .orderBy(desc(tripsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tripsTable)
      .where(whereClause),
  ]);

  const totalCount = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(totalCount / limit);

  const buildUrl = (overrides: Record<string, string>) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) q.set('status', statusFilter);
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) q.set(k, v); else q.delete(k);
    }
    return `/dashboard/trips?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">متابعة السفرات</h3>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form className="flex flex-wrap items-end gap-4" dir="rtl">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">الحالة</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">من تاريخ</label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">إلى تاريخ</label>
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              تصفية
            </button>
            <Link
              href="/dashboard/trips"
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              إعادة تعيين
            </Link>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">التاريخ</th>
                <th className="px-6 py-4 font-medium">الاتجاه</th>
                <th className="px-6 py-4 font-medium">السائق</th>
                <th className="px-6 py-4 font-medium">الحالة</th>
                <th className="px-6 py-4 font-medium">وقت البدء</th>
                <th className="px-6 py-4 font-medium">وقت الانتهاء</th>
                <th className="px-6 py-4 font-medium">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tripRows.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {new Date(trip.tripDate).toLocaleDateString('ar-IQ')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${trip.direction === 'go' ? 'bg-cyan-100 text-cyan-700' : 'bg-violet-100 text-violet-700'}`}>
                      {trip.direction === 'go' ? 'ذهاب' : 'عودة'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {trip.driverFullName ? (
                      <div>
                        <span>{trip.driverFullName}</span>
                        {trip.driverPhone && (
                          <span className="text-gray-400 text-xs block" dir="ltr">{trip.driverPhone}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[trip.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[trip.status] || trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {trip.startedAt ? new Date(trip.startedAt).toLocaleTimeString('ar-IQ') : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {trip.endedAt ? new Date(trip.endedAt).toLocaleTimeString('ar-IQ') : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(trip.createdAt).toLocaleDateString('ar-IQ')}
                  </td>
                </tr>
              ))}

              {tripRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    لا توجد سفرات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              إجمالي {totalCount} سفرة | صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2" dir="ltr">
              <Link
                href={buildUrl({ page: String(Math.max(1, page - 1)) })}
                className={`px-3 py-1 text-sm rounded border ${page <= 1 ? 'text-gray-300 border-gray-200 pointer-events-none' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                aria-disabled={page <= 1}
              >
                السابق
              </Link>
              <Link
                href={buildUrl({ page: String(Math.min(totalPages, page + 1)) })}
                className={`px-3 py-1 text-sm rounded border ${page >= totalPages ? 'text-gray-300 border-gray-200 pointer-events-none' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                aria-disabled={page >= totalPages}
              >
                التالي
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}