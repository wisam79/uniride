import React from 'react';
import { db } from '@workspace/db';
import { tripsTable } from '@workspace/db/schema';
import { sql } from 'drizzle-orm';
import { getDashboardStats } from '@/lib/dashboard-actions';
import { Users, Truck, CreditCard, Route, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-IQ') + ' د.ع';
}

export default async function DashboardPage() {
  const [stats, recentTrips] = await Promise.all([
    getDashboardStats(),
    db.select().from(tripsTable).orderBy(sql`created_at DESC`).limit(5),
  ]);

  const mainStats = [
    { title: 'الطلاب المسجلون', value: stats.totalStudents, icon: Users, color: 'bg-blue-500', textColor: 'text-blue-600' },
    { title: 'السائقون المسجلون', value: stats.totalDrivers, icon: Truck, color: 'bg-green-500', textColor: 'text-green-600' },
    { title: 'الاشتراكات النشطة', value: stats.activeSubscriptions, icon: CreditCard, color: 'bg-orange-500', textColor: 'text-orange-600' },
    { title: 'إجمالي السفرات', value: stats.totalTrips, icon: Route, color: 'bg-purple-500', textColor: 'text-purple-600' },
  ];

  const financialStats = [
    { title: 'إجمالي الإيرادات', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { title: 'إجمالي العمولات', value: formatCurrency(stats.totalCommission), icon: TrendingUp, color: 'bg-rose-500', textColor: 'text-rose-600' },
    { title: 'صافي السائقين', value: formatCurrency(stats.totalRevenue - stats.totalCommission), icon: Calendar, color: 'bg-indigo-500', textColor: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h3 className="text-2xl font-bold text-gray-800">نظرة عامة</h3>
        <p className="text-gray-500 mt-1">ملخص إحصائيات النظام ليوم {new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad' }).format(new Date())}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color} bg-opacity-10`}>
                <stat.icon size={24} className={stat.textColor} />
              </div>
              <span className={`text-3xl font-bold ${stat.textColor}`}>{stat.value.toLocaleString('ar-IQ')}</span>
            </div>
            <p className="text-gray-500 text-sm mt-3 font-medium">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {financialStats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color} bg-opacity-10`}>
                <stat.icon size={20} className={stat.textColor} />
              </div>
              <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
            </div>
            <span className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Route size={20} className="text-gray-400" /> آخر السفرات
          </h4>
          {recentTrips.length === 0 ? (
            <p className="text-gray-400 text-center py-8">لا توجد سفرات بعد</p>
          ) : (
            <div className="space-y-3">
              {recentTrips.map((trip: any) => (
                <div key={trip.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {trip.direction === 'go' ? 'ذهاب' : 'عودة'} - {new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad' }).format(new Date(trip.tripDate))}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(trip.createdAt).toLocaleTimeString('ar-IQ')}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                    trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    trip.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                    trip.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {trip.status === 'completed' ? 'مكتملة' :
                     trip.status === 'cancelled' ? 'ملغاة' :
                     trip.status === 'in_transit' ? 'جارية' :
                     trip.status === 'scheduled' ? 'مجدولة' : trip.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-gray-400" /> الإجراءات السريعة
          </h4>
          <div className="space-y-3">
            <a href="/dashboard/users" className="block p-4 rounded-lg bg-blue-50 hover:bg-blue-100">
              <p className="font-medium text-blue-800">إضافة مستخدم جديد</p>
              <p className="text-sm text-blue-600 mt-1">تسجيل طالب أو سائق</p>
            </a>
            <a href="/dashboard/routes" className="block p-4 rounded-lg bg-green-50 hover:bg-green-100">
              <p className="font-medium text-green-800">إدارة الخطوط</p>
              <p className="text-sm text-green-600 mt-1">إضافة وتعديل الخطوط</p>
            </a>
            <a href="/dashboard/subscriptions" className="block p-4 rounded-lg bg-orange-50 hover:bg-orange-100">
              <p className="font-medium text-orange-800">مراجعة الاشتراكات</p>
              <p className="text-sm text-orange-600 mt-1">متابعة المدفوعات</p>
            </a>
            <a href="/dashboard/trips" className="block p-4 rounded-lg bg-purple-50 hover:bg-purple-100">
              <p className="font-medium text-purple-800">متابعة السفرات</p>
              <p className="text-sm text-purple-600 mt-1">مراقبة السفرات</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}