import React from 'react';
import { LayoutDashboard, Users, CreditCard, MapPin, Route, LogOut } from 'lucide-react';
// Next.js Link
import NextLink from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 text-right" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0D2847] text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="bg-[#FF6B35] p-2 rounded-lg text-sm">مدير</span>
            UniRide
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NextLink href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors">
            <LayoutDashboard size={20} />
            <span className="font-medium">الرئيسية</span>
          </NextLink>
          <NextLink href="/dashboard/users" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors">
            <Users size={20} />
            <span className="font-medium">المستخدمون</span>
          </NextLink>
          <NextLink href="/dashboard/routes" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors">
            <Route size={20} />
            <span className="font-medium">الخطوط</span>
          </NextLink>
          <NextLink href="/dashboard/subscriptions" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors">
            <CreditCard size={20} />
            <span className="font-medium">الاشتراكات</span>
          </NextLink>
          <NextLink href="/dashboard/trips" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors">
            <MapPin size={20} />
            <span className="font-medium">السفرات</span>
          </NextLink>
          <NextLink href="/dashboard/cards" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors opacity-50 cursor-not-allowed">
            <CreditCard size={20} />
            <span className="font-medium">البطاقات (قريباً)</span>
          </NextLink>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
            <LogOut size={20} />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-800">لوحة التحكم</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">مرحباً بك في نظام الإدارة</div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">A</div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
