import React from 'react';
import { subscriptionRepository } from '@workspace/db/repositories';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-IQ') + ' د.ع';
}

interface Props {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    status?: string;
    paymentStatus?: string;
  }>;
}

export default async function SubscriptionsPage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const page = Math.max(1, parseInt((params as any).page || '1'));
  const limit = Math.min(100, Math.max(10, parseInt((params as any).limit || '20')));
  const offset = (page - 1) * limit;
  const statusFilter = (params as any).status || 'all';
  const paymentStatusFilter = (params as any).paymentStatus || 'all';

  const [subscriptions, totalCount] = await Promise.all([
    subscriptionRepository.findAllFiltered({
      limit,
      offset,
      status: statusFilter,
      paymentStatus: paymentStatusFilter,
    }),
    subscriptionRepository.countFiltered({
      status: statusFilter,
      paymentStatus: paymentStatusFilter,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const baseParams = new URLSearchParams();
  if (statusFilter !== 'all') baseParams.set('status', statusFilter);
  if (paymentStatusFilter !== 'all') baseParams.set('paymentStatus', paymentStatusFilter);
  baseParams.set('limit', String(limit));

  function pageUrl(p: number): string {
    const q = new URLSearchParams(baseParams);
    q.set('page', String(p));
    return `/dashboard/subscriptions?${q.toString()}`;
  }

  function filterUrl(status: string, paymentStatus: string): string {
    const q = new URLSearchParams();
    if (status !== 'all') q.set('status', status);
    if (paymentStatus !== 'all') q.set('paymentStatus', paymentStatus);
    q.set('page', '1');
    q.set('limit', String(limit));
    return `/dashboard/subscriptions?${q.toString()}`;
  }

  const statusBadge = (s: string) => {
    switch (s) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'expired':
        return 'bg-gray-100 text-gray-600';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'active': return 'نشط';
      case 'cancelled': return 'ملغى';
      case 'expired': return 'منتهي';
      case 'pending': return 'معلق';
      default: return s;
    }
  };

  const paymentBadge = (s: string) => {
    switch (s) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'refunded':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const paymentLabel = (s: string) => {
    switch (s) {
      case 'paid': return 'مدفوع';
      case 'pending': return 'قيد الانتظار';
      case 'failed': return 'فشل';
      case 'refunded': return 'مسترجع';
      default: return s;
    }
  };

  const statusOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'active', label: 'نشط' },
    { value: 'cancelled', label: 'ملغى' },
    { value: 'expired', label: 'منتهي' },
  ];

  const paymentOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'paid', label: 'مدفوع' },
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'failed', label: 'فشل' },
    { value: 'refunded', label: 'مسترجع' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">إدارة الاشتراكات</h3>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">الحالة:</span>
            <div className="flex gap-1">
              {statusOptions.map(opt => (
                <a
                  key={opt.value}
                  href={filterUrl(opt.value, paymentStatusFilter)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-[#0D2847] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </a>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-gray-200" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">الدفع:</span>
            <div className="flex gap-1">
              {paymentOptions.map(opt => (
                <a
                  key={opt.value}
                  href={filterUrl(statusFilter, opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    paymentStatusFilter === opt.value
                      ? 'bg-[#0D2847] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">الطالب</th>
                <th className="px-6 py-4 font-medium">السائق</th>
                <th className="px-6 py-4 font-medium">تاريخ البداية</th>
                <th className="px-6 py-4 font-medium">تاريخ النهاية</th>
                <th className="px-6 py-4 font-medium">الرسوم الشهرية</th>
                <th className="px-6 py-4 font-medium">العمولة</th>
                <th className="px-6 py-4 font-medium">صافي السائق</th>
                <th className="px-6 py-4 font-medium">حالة الدفع</th>
                <th className="px-6 py-4 font-medium">الحالة</th>
                <th className="px-6 py-4 font-medium" dir="ltr">السفرات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {sub.studentName || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {sub.driverName || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {sub.startDate
                      ? new Date(sub.startDate).toLocaleDateString('ar-IQ')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {sub.endDate
                      ? new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad' }).format(new Date(sub.endDate))
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium" dir="ltr">
                    {formatCurrency(sub.monthlyFee)}
                  </td>
                  <td className="px-6 py-4 text-gray-900" dir="ltr">
                    {formatCurrency(sub.commissionAmount)}
                  </td>
                  <td className="px-6 py-4 text-gray-900" dir="ltr">
                    {formatCurrency(sub.driverPayout)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${paymentBadge(sub.paymentStatus)}`}
                    >
                      {paymentLabel(sub.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(sub.status)}`}
                    >
                      {statusLabel(sub.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-center" dir="ltr">
                    {sub.tripsUsed} / {sub.tripsPerMonth}
                  </td>
                </tr>
              ))}

              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    لا توجد اشتراكات مطابقة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              إجمالي {totalCount.toLocaleString('ar-IQ')} اشتراك | صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2" dir="ltr">
              <a
                href={pageUrl(Math.max(1, page - 1))}
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
                href={pageUrl(Math.min(totalPages, page + 1))}
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