# UniRide v3 — دليل النشر الكامل

> **الحالة:** الكود جاهز للنشر — 123/123 اختبار ✅ — البناء نجح ✅
> **التاريخ:** 2026-05-12

---

## المتطلبات الأولية

تثبيت Supabase CLI إذا لم يكن مثبتاً:

```powershell
# Windows (PowerShell)
winget install Supabase.CLI

# أو عبر npm
npm install -g supabase
```

تسجيل الدخول:

```bash
supabase login
```

---

## الخطوة 1 — التحقق قبل النشر (Dry Run)

```bash
cd "C:\Users\Laptop Shop\Downloads\uniride"

supabase db push --dry-run
```

يجب أن يظهر migration واحد جديد:

```
2026051114_cancel_subscription.sql
```

---

## الخطوة 2 — نشر قاعدة البيانات

```bash
supabase db push
```

هذا يطبق:

- `2026051113_feature_flags_and_analytics.sql` (إذا لم يكن مطبقاً)
- `2026051114_cancel_subscription.sql` ← الجديد

---

## الخطوة 3 — نشر Edge Functions

```bash
supabase functions deploy send-notification
supabase functions deploy trip-engine
supabase functions deploy zaincash-checkout
supabase functions deploy zaincash-webhook
```

---

## الخطوة 4 — تعيين Secrets للـ Edge Functions

```bash
supabase secrets set ADMIN_URL=https://your-admin-domain.com
```

---

## الخطوة 5 — بناء ونشر لوحة التحكم

لوحة التحكم Next.js — انشرها على Vercel أو أي hosting:

```bash
# بناء محلي (تم بنجاح)
pnpm --filter admin-dashboard build

# نشر على Vercel
cd apps/admin
vercel --prod
```

متغيرات البيئة المطلوبة في Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://zpcvvyxtmxzplmojobbv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## الخطوة 6 — بناء التطبيق المحمول

```bash
cd apps/mobile

# بناء للإنتاج
eas build --platform all --profile production

# أو للاختبار
eas build --platform all --profile preview
```

---

## التحقق بعد النشر

```bash
# التحقق من الـ migrations
supabase db push --dry-run
# يجب أن يقول: "No new migrations to apply"

# اختبار cancel_subscription RPC
supabase db execute --sql "SELECT cancel_subscription('00000000-0000-0000-0000-000000000000');"
# يجب أن يرجع: "Subscription not found" (وليس خطأ SQL)

# التحقق من feature_flags
supabase db execute --sql "SELECT name, enabled FROM feature_flags ORDER BY name;"
```

---

## ملخص التغييرات في هذا الإصدار (M7)

### قاعدة البيانات

- ✅ إصلاح تعارض migration رقم `2026051112` → `2026051113`
- ✅ إضافة `cancel_subscription()` RPC آمن يسترد المقعد

### لوحة التحكم (Admin)

- ✅ صفحة `/trips` — إدارة الرحلات مع إلغاء يدوي
- ✅ صفحة `/subscriptions` — إدارة الاشتراكات
- ✅ صفحة `/feature-flags` — تفعيل/تعطيل الميزات
- ✅ Dashboard auto-refresh كل 30 ثانية
- ✅ Analytics Date Range Picker
- ✅ Licenses فلتر متقدم + بحث
- ✅ Drivers يعرض بيانات المركبة الكاملة
- ✅ Profile Show يعرض اسم المؤسسة

### Edge Functions

- ✅ send-notification: CORS آمن + دعم متعدد الأجهزة

### التطبيق المحمول

- ✅ cancel_subscription يستخدم RPC (يسترد المقعد)
- ✅ useActiveTrips يفلتر بمؤسسة الطالب
- ✅ GPS validation للإحداثيات
- ✅ logger بدلاً من console.warn
- ✅ Feature flags cache يُمسح عند logout
