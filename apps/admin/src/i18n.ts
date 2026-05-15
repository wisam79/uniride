import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Translations } from '@uniride/core';

const resources = {
  ar: {
    translation: {
      ...Translations.ar,
      documentTitle: {
        default: 'يونيرايد - لوحة التحكم',
      },
      dashboard: {
        title: 'الرئيسية',
        stats: {
          total_users: 'إجمالي المستخدمين',
          active_drivers: 'السائقون النشطون',
          active_routes: 'الخطوط الفعالة',
          active_trips: 'الرحلات الحية',
          total_routes: 'إجمالي الخطوط',
          total_trips: 'إجمالي الرحلات',
          active_subscriptions: 'الاشتراكات الفعالة',
          monthly_revenue: 'الأرباح الشهرية',
        },
        charts: {
          trips_activity: 'نشاط الرحلات (آخر 7 أيام)',
          outcomes: 'نتائج الرحلات',
          top_routes: 'أكثر الخطوط طلباً',
          revenue_trend: 'توجه الأرباح',
        },
        realtime: {
          live: 'مباشر',
          connecting: 'جاري الاتصال...',
          connected: 'متصل',
          disconnected: 'منقطع',
        },
        live_trips_notice_title: 'الرحلات الحية الان',
        live_trips_notice_desc: 'رحلة/رحلات نشطة حالياً. راجع التفاصيل في قسم الرحلات.',
        refresh: 'تحديث البيانات',
        last_updated: 'آخر تحديث: {{time}}',
        update_failed: 'تعذّر تحديث البيانات — تعرض آخر نسخة محفوظة',
      },
      analytics: {
        title: 'التحليلات',
        date_range: 'الفترة الزمنية',
        apply: 'تطبيق',
        reset: 'إعادة ضبط (30 يوم)',
        kpis: {
          total_trips: 'إجمالي الرحلات',
          active_students: 'الطلاب النشطون',
          revenue: 'الأرباح (د.ع)',
          avg_rating: 'متوسط التقييم',
        },
        outcomes: {
          title: 'نتائج الرحلات',
          completion: 'نسبة الإكمال',
          cancellation: 'نسبة الإلغاء',
          active_drivers: 'السائقون النشطون',
        },
        performance: {
          title: 'أداء الاستعلامات',
          query: 'الاستعلام',
          calls: 'النداءات',
          avg_ms: 'المعدل (ms)',
          total_ms: 'الإجمالي (ms)',
          rows: 'الصفوف',
          not_available: 'مراقبة الاستعلامات غير متوفرة',
        },
      },
      profiles: {
        titles: {
          list: 'المستخدمين',
          show: 'عرض المستخدم',
          edit: 'تعديل المستخدم',
          create: 'إضافة مستخدم',
        },
        fields: {
          id: 'المعرف',
          fullName: 'الاسم الكامل',
          phone: 'الهاتف',
          role: 'الدور',
          joined: 'تاريخ الانضمام',
          actions: 'الإجراءات',
        },
      },
      trips: {
        titles: {
          list: 'الرحلات الحية',
          show: 'عرض الرحلة',
          edit: 'تعديل الرحلة',
          create: 'إضافة رحلة',
        },
        fields: {
          id: 'المعرف',
          status: 'الحالة',
          route: 'المسار',
          driver: 'السائق',
          scheduledAt: 'وقت الجدولة',
          startedAt: 'وقت البدء',
          actions: 'الإجراءات',
        },
        all_statuses: 'كل الحالات',
      },
      routes: {
        titles: { list: 'الخطوط', show: 'عرض الخط', edit: 'تعديل الخط', create: 'إضافة خط' },
        fields: {
          id: 'المعرف',
          title: 'العنوان',
          driver: 'السائق',
          startLocation: 'نقطة الانطلاق',
          endLocation: 'نقطة النهاية',
          price: 'السعر',
          capacity: 'السعة',
          availableSeats: 'المقاعد المتاحة',
          active: 'فعال',
          actions: 'الإجراءات',
        },
      },
      subscriptions: {
        titles: {
          list: 'الاشتراكات',
          show: 'عرض الاشتراك',
          edit: 'تعديل الاشتراك',
          create: 'إضافة اشتراك',
        },
        fields: {
          student: 'الطالب',
          route: 'الخط',
          status: 'الحالة',
          startDate: 'تاريخ البدء',
          endDate: 'تاريخ الانتهاء',
          createdAt: 'تاريخ الإنشاء',
        },
      },
      license_batches: {
        titles: {
          list: 'دفعات التراخيص',
          show: 'عرض الدفعة',
          edit: 'تعديل الدفعة',
          create: 'إضافة دفعة',
        },
        fields: {
          name: 'اسم الدفعة',
          route: 'الخط',
          quantity: 'الكمية',
          price: 'السعر',
          validDays: 'أيام الصلاحية',
          createdAt: 'تاريخ الإنشاء',
        },
      },
      licenses: {
        titles: {
          list: 'التراخيص',
          show: 'عرض الترخيص',
          edit: 'تعديل الترخيص',
          create: 'إضافة ترخيص',
        },
        fields: {
          code: 'الكود',
          status: 'الحالة',
          usedBy: 'استخدم بواسطة',
          usedAt: 'تاريخ الاستخدام',
          validDays: 'أيام الصلاحية',
          createdAt: 'تاريخ الإنشاء',
        },
      },
      drivers: {
        titles: {
          list: 'إدارة السائقين',
          show: 'عرض السائق',
          edit: 'تعديل السائق',
          create: 'إضافة سائق',
        },
        fields: {
          driverName: 'اسم السائق',
          phone: 'الهاتف',
          licenseNumber: 'رقم الرخصة',
          vehicle: 'المركبة',
          plate: 'اللوحة',
          capacity: 'السعة',
          verified: 'موثق',
          registered: 'تاريخ التسجيل',
          actions: 'الإجراءات',
        },
      },
      institutions: {
        titles: {
          list: 'المؤسسات',
          show: 'عرض المؤسسة',
          edit: 'تعديل المؤسسة',
          create: 'إضافة مؤسسة',
        },
        fields: {
          id: 'المعرف',
          name: 'الاسم',
          city: 'المدينة',
          createdAt: 'تاريخ الإنشاء',
          actions: 'الإجراءات',
        },
      },
      feature_flags: {
        titles: {
          list: 'ميزات النظام',
        },
      },
      audit_logs: {
        titles: {
          list: 'سجل المراجعة',
        },
        fields: {
          user: 'المستخدم',
          action: 'الإجراء',
          resource: 'المورد',
          resourceId: 'معرف المورد',
          details: 'التفاصيل',
          createdAt: 'التاريخ',
        },
      },
      notifications: {
        titles: {
          broadcast: 'بث الإشعارات',
        },
        fields: {
          target: 'الفئة المستهدفة',
          title: 'عنوان الإشعار',
          body: 'محتوى الإشعار',
        },
        targets: {
          all: 'جميع المستخدمين',
          student: 'الطلاب فقط',
          driver: 'السائقين فقط',
        },
        success: 'تم إرسال الإشعار بنجاح إلى {{sent}} جهاز',
        failed: 'فشل الإرسال',
        send: 'إرسال الآن',
      },
      payouts: {
        titles: {
          list: 'طلبات السحب',
        },
        fields: {
          driverName: 'اسم السائق',
          phone: 'رقم الهاتف',
          amount: 'المبلغ',
          status: 'الحالة',
          referenceNote: 'ملاحظة مرجعية',
          createdAt: 'تاريخ الطلب',
        },
        status: {
          pending: 'قيد الانتظار',
          completed: 'مكتمل',
          rejected: 'مرفوض',
        },
        actions: {
          approve: 'اعتماد',
          reject: 'رفض',
        },
      },
      actions: {
        actions: 'الإجراءات',
        edit: 'تعديل',
        show: 'عرض',
        create: 'إنشاء',
        delete: 'حذف',
        save: 'حفظ',
        cancel: 'إلغاء',
        export: 'تصدير',
      },
      buttons: {
        logout: 'تسجيل الخروج',
      },
      yes: 'نعم',
      no: 'لا',
    },
  },
  en: {
    translation: {
      ...Translations.en,
      documentTitle: {
        default: 'UniRide - Admin Dashboard',
      },
      dashboard: {
        title: 'Dashboard',
        stats: {
          total_users: 'Total Users',
          active_drivers: 'Active Drivers',
          active_routes: 'Active Routes',
          active_trips: 'Active Trips',
          total_routes: 'Total Routes',
          total_trips: 'Total Trips',
          active_subscriptions: 'Active Subscriptions',
          monthly_revenue: 'Monthly Revenue',
        },
        charts: {
          trips_activity: 'Trips Activity (Last 7 Days)',
          outcomes: 'Trip Outcomes',
          top_routes: 'Top Routes',
          revenue_trend: 'Revenue Trend',
        },
        realtime: {
          live: 'LIVE',
          connecting: 'Connecting...',
          connected: 'Connected',
          disconnected: 'Disconnected',
        },
        live_trips_notice_title: 'Live Trips',
        live_trips_notice_desc: 'trip(s) currently active. View details in the Trips section.',
        refresh: 'Refresh Data',
        last_updated: 'Last updated: {{time}}',
        update_failed: 'Failed to update data — showing last cached version',
      },
      analytics: {
        title: 'Analytics',
        date_range: 'Date Range',
        apply: 'Apply',
        reset: 'Reset (30d)',
        kpis: {
          total_trips: 'Total Trips',
          active_students: 'Active Students',
          revenue: 'Revenue (IQD)',
          avg_rating: 'Avg Rating',
        },
        outcomes: {
          title: 'Trip Outcomes',
          completion: 'Completion Rate',
          cancellation: 'Cancellation Rate',
          active_drivers: 'Active Drivers',
        },
        performance: {
          title: 'Query Performance',
          query: 'Query',
          calls: 'Calls',
          avg_ms: 'Avg (ms)',
          total_ms: 'Total (ms)',
          rows: 'Rows',
          not_available: 'Query monitoring not available',
        },
      },
      profiles: {
        titles: { list: 'Users', show: 'Show User', edit: 'Edit User', create: 'Create User' },
        fields: {
          id: 'ID',
          fullName: 'Full Name',
          phone: 'Phone',
          role: 'Role',
          joined: 'Joined At',
          actions: 'Actions',
        },
      },
      trips: {
        titles: { list: 'Live Trips', show: 'Show Trip', edit: 'Edit Trip', create: 'Create Trip' },
        fields: {
          id: 'ID',
          status: 'Status',
          route: 'Route',
          driver: 'Driver',
          scheduledAt: 'Scheduled At',
          startedAt: 'Started At',
          actions: 'Actions',
        },
        all_statuses: 'All Statuses',
      },
      routes: {
        titles: { list: 'Routes', show: 'Show Route', edit: 'Edit Route', create: 'Create Route' },
        fields: {
          id: 'ID',
          title: 'Title',
          driver: 'Driver',
          startLocation: 'Start Location',
          endLocation: 'End Location',
          price: 'Price',
          capacity: 'Capacity',
          availableSeats: 'Available Seats',
          active: 'Active',
          actions: 'Actions',
        },
      },
      subscriptions: {
        titles: {
          list: 'Subscriptions',
          show: 'Show Subscription',
          edit: 'Edit Subscription',
          create: 'Create Subscription',
        },
        fields: {
          student: 'Student',
          route: 'Route',
          status: 'Status',
          startDate: 'Start Date',
          endDate: 'End Date',
          createdAt: 'Created At',
        },
      },
      license_batches: {
        titles: {
          list: 'License Batches',
          show: 'Show Batch',
          edit: 'Edit Batch',
          create: 'Create Batch',
        },
        fields: {
          name: 'Batch Name',
          route: 'Route',
          quantity: 'Quantity',
          price: 'Price',
          validDays: 'Valid Days',
          createdAt: 'Created At',
        },
      },
      licenses: {
        titles: {
          list: 'Licenses',
          show: 'Show License',
          edit: 'Edit License',
          create: 'Create License',
        },
        fields: {
          code: 'Code',
          status: 'Status',
          usedBy: 'Used By',
          usedAt: 'Used At',
          validDays: 'Valid Days',
          createdAt: 'Created At',
        },
      },
      drivers: {
        titles: {
          list: 'Drivers Management',
          show: 'Show Driver',
          edit: 'Edit Driver',
          create: 'Create Driver',
        },
        fields: {
          driverName: 'Driver Name',
          phone: 'Phone',
          licenseNumber: 'License No.',
          vehicle: 'Vehicle',
          plate: 'Plate',
          capacity: 'Capacity',
          verified: 'Verified',
          registered: 'Registered',
          actions: 'Actions',
        },
      },
      institutions: {
        titles: {
          list: 'Institutions',
          show: 'Show Institution',
          edit: 'Edit Institution',
          create: 'Create Institution',
        },
        fields: {
          id: 'ID',
          name: 'Name',
          city: 'City',
          createdAt: 'Created At',
          actions: 'Actions',
        },
      },
      feature_flags: {
        titles: {
          list: 'Feature Flags',
        },
      },
      audit_logs: {
        titles: {
          list: 'Audit Logs',
        },
        fields: {
          user: 'User',
          action: 'Action',
          resource: 'Resource',
          resourceId: 'Resource ID',
          details: 'Details',
          createdAt: 'Date',
        },
      },
      notifications: {
        titles: {
          broadcast: 'Push Notifications',
        },
        fields: {
          target: 'Target Audience',
          title: 'Notification Title',
          body: 'Notification Body',
        },
        targets: {
          all: 'All Users',
          student: 'Students Only',
          driver: 'Drivers Only',
        },
        success: 'Successfully sent to {{sent}} devices',
        failed: 'Failed to send',
        send: 'Send Now',
      },
      payouts: {
        titles: {
          list: 'Payout Requests',
        },
        fields: {
          driverName: 'Driver Name',
          phone: 'Phone Number',
          amount: 'Amount',
          status: 'Status',
          referenceNote: 'Reference Note',
          createdAt: 'Request Date',
        },
        status: {
          pending: 'Pending',
          completed: 'Completed',
          rejected: 'Rejected',
        },
        actions: {
          approve: 'Approve',
          reject: 'Reject',
        },
      },
      actions: {
        actions: 'Actions',
      },
      buttons: {
        logout: 'Logout',
      },
      yes: 'Yes',
      no: 'No',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ar', // Default to Arabic
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
});

export default i18n;
