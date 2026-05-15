# 🚀 دليل البدء — UniRide v3

---

## المتطلبات الأساسية

| الأداة       | الإصدار المطلوب | التثبيت                            |
| ------------ | --------------- | ---------------------------------- |
| Node.js      | ≥ 22.0.0        | [nodejs.org](https://nodejs.org)   |
| pnpm         | ≥ 10.0.0        | `npm install -g pnpm`              |
| Supabase CLI | latest          | `winget install Supabase.CLI`      |
| Git          | أي إصدار        | [git-scm.com](https://git-scm.com) |

---

## 1. استنساخ المشروع

```bash
git clone <repo-url> uniride
cd uniride
pnpm install
```

---

## 2. إعداد متغيرات البيئة

```bash
cp .env.example .env
```

عدّل `.env` بالقيم التالية:

```env
# Supabase (Local Dev Project)
NEXT_PUBLIC_SUPABASE_URL=https://pfjsqgqrxnrlrfnchnqf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>

# Mobile App
EXPO_PUBLIC_SUPABASE_URL=https://pfjsqgqrxnrlrfnchnqf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>

# Expo Push Notifications
EXPO_TOKEN=<your-expo-token>
```

> **ملاحظة:** لا تضع قيم production في `.env` — استخدم `.env.local` أو Supabase Secrets.

---

## 3. ربط Supabase

```bash
# تسجيل الدخول
supabase login

# ربط بمشروع التطوير
supabase link --project-ref pfjsqgqrxnrlrfnchnqf

# التحقق من الربط
supabase status
```

---

## 4. تطبيق قاعدة البيانات

```bash
# تطبيق جميع الـ migrations على مشروع التطوير
supabase db push

# التحقق من الـ migrations المطبقة
supabase migration list
```

يجب أن ترى 16 migration مطبقاً بنجاح.

---

## 5. تشغيل التطبيقات

### لوحة التحكم (Admin Dashboard)

```bash
pnpm --filter admin-dashboard dev
```

افتح `http://localhost:3000` في المتصفح.

**بيانات الدخول الافتراضية:**

- البريد: `admin@uniride.com`
- كلمة المرور: راجع Supabase Auth dashboard

### التطبيق المحمول (Mobile App)

```bash
pnpm --filter mobile-app start
```

- امسح QR code بتطبيق **Expo Go**
- أو اضغط `i` لـ iOS Simulator / `a` لـ Android Emulator

---

## 6. تشغيل Edge Functions محلياً

```bash
supabase functions serve
```

ستعمل الـ functions على `http://localhost:54321/functions/v1/`

---

## 7. تشغيل الاختبارات

```bash
# اختبارات الوحدة والتكامل
pnpm test

# مع تقرير التغطية
pnpm test -- --coverage

# اختبارات E2E
pnpm test:e2e
```

---

## 8. أوامر التطوير اليومية

```bash
pnpm dev              # تشغيل كل التطبيقات معاً
pnpm build            # بناء كل التطبيقات
pnpm format --write   # تنسيق الكود
pnpm typecheck        # فحص TypeScript
```

---

## 9. هيكل المشروع

```
uniride/
├── apps/
│   ├── admin/                    ← Next.js 16 + Refine + MUI
│   │   └── src/
│   │       ├── app/              ← صفحات App Router
│   │       │   ├── page.tsx      ← Dashboard
│   │       │   ├── trips/        ← إدارة الرحلات
│   │       │   ├── subscriptions/← إدارة الاشتراكات
│   │       │   ├── drivers/      ← إدارة السائقين
│   │       │   ├── routes/       ← إدارة الخطوط
│   │       │   ├── licenses/     ← تتبع الأكواد
│   │       │   ├── license_batches/ ← دفعات الأكواد
│   │       │   ├── institutions/ ← إدارة المؤسسات
│   │       │   ├── analytics/    ← تحليلات مع Date Range
│   │       │   ├── feature-flags/← تفعيل/تعطيل الميزات
│   │       │   └── profiles/     ← إدارة المستخدمين
│   │       ├── components/
│   │       │   └── layout.tsx    ← Sidebar navigation
│   │       └── providers/
│   │           ├── authProvider.ts   ← Auth (app_metadata فقط)
│   │           ├── dataProvider.ts   ← snake_case ↔ camelCase
│   │           └── supabaseClient.ts
│   │
│   └── mobile/                   ← Expo 54 + React Native
│       ├── app/                  ← Expo Router screens
│       │   ├── index.tsx         ← الرئيسية: خطوط الجامعة
│       │   ├── booking.tsx       ← تفاصيل الخط
│       │   ├── activate.tsx      ← تفعيل كود الترخيص
│       │   ├── subscriptions.tsx ← اشتراكاتي
│       │   ├── driver.tsx        ← لوحة السائق
│       │   ├── create-trip.tsx   ← إنشاء رحلة
│       │   ├── tracking/[tripId] ← تتبع الرحلة + خريطة
│       │   └── rating/[tripId]   ← تقييم الرحلة
│       └── src/
│           ├── hooks/
│           │   ├── useTrips.ts       ← GPS + Realtime + Offline
│           │   ├── useRoutes.ts      ← Institution filtering
│           │   ├── useNetworkStatus.ts ← ping() RPC
│           │   ├── useFeatureFlags.ts  ← Feature flags + Realtime
│           │   └── useStore.ts       ← 4 Zustand stores
│           └── lib/
│               ├── offlineCache.ts   ← Subscription offline cache
│               └── logger.ts         ← Structured logger
│
├── packages/
│   └── core/
│       └── index.ts              ← Zod schemas, state machine, i18n
│
└── supabase/
    ├── functions/
    │   ├── trip-engine/          ← تحديث حالة الرحلة (v6)
    │   ├── send-notification/    ← إشعارات Expo Push (v4)
    │   ├── zaincash-checkout/    ← بوابة دفع (stub)
    │   └── zaincash-webhook/     ← تأكيد الدفع (stub)
    └── migrations/               ← 16 migration — مصدر الحقيقة
```

---

## 10. حل المشاكل الشائعة

### خطأ: `supabase: command not found`

```bash
winget install Supabase.CLI
# أو
npm install -g supabase
```

### خطأ: `Cannot find module '@uniride/core'`

```bash
pnpm install
# تأكد من تشغيل الأمر من جذر المشروع
```

### خطأ: `RLS policy violation`

- تأكد من أن المستخدم لديه `app_metadata.role` صحيح
- راجع [SECURITY.md](./SECURITY.md)

### الـ migrations لا تُطبَّق

```bash
supabase db push --dry-run  # اختبار أولاً
supabase db push            # تطبيق فعلي
```
