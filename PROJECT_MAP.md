# UniRide v3 — خريطة المشروع

> **آخر تحديث:** 2026-05-12 | **الإصدار:** v3.0.0 | **الاختبارات:** 123/123 ✅

---

## [TECH_STACK]

| الطبقة           | التقنية                                  | الإصدار                  |
| ---------------- | ---------------------------------------- | ------------------------ |
| Admin Dashboard  | Next.js + React + MUI + Refine           | Next.js 16.2.6, React 19 |
| Mobile App       | Expo + React Native + Expo Router        | Expo 54                  |
| Shared Logic     | packages/core (Zod, i18n, state machine) | TypeScript 5.4.5         |
| Database         | Supabase PostgreSQL + RLS                | 16 migrations            |
| Edge Functions   | Deno (Supabase Functions)                | 4 functions              |
| Testing          | Vitest (unit) + Playwright (E2E)         | Vitest 1.6.0             |
| State Management | Zustand 5 + AsyncStorage                 | Mobile only              |
| Admin State      | Refine + React Hook Form                 | Server state             |

> ⚠️ `packages/db` (Drizzle) **محذوف** — لا تُضِف أي كود يعتمد عليه.

---

## [SYSTEM_FLOW]

```
تسجيل الدخول
    → Auth JWT (app_metadata.role)
    → Profile يُحمَّل من profiles table

نظام التراخيص
    → Admin: create_license_batch() → N كود مشفّر
    → Student: activate_license(code) → subscription نشطة + خصم مقعد

إدارة الرحلات
    → Driver: create_trip() → رحلة مجدولة
    → Driver: trip-engine Edge Function → تحديث الحالة + GPS
    → Student: Realtime subscription → يرى الموقع الحي

تتبع GPS
    → [متصل]: update_trip_location() RPC مباشرة
    → [غير متصل]: AsyncStorage queue → flush عند عودة الاتصال

إلغاء الاشتراك
    → cancel_subscription() RPC → يُلغي + يُعيد المقعد ذرياً

Feature Flags
    → Admin يُفعّل/يُعطّل من /feature-flags
    → Realtime → التطبيق المحمول يتحدث فوراً

الإشعارات
    → send-notification Edge Function
    → Expo Push API (multi-device)

الأمان
    → app_metadata.role (وليس user_metadata)
    → RLS على كل الجداول
    → Rate Limiting DB-backed
    → Idempotency في Edge Functions
```

---

## [ARCHITECTURE]

```
uniride/
├── apps/
│   ├── admin/                    ← لوحة تحكم Next.js
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx              ← Dashboard (auto-refresh 30s)
│   │       │   ├── trips/page.tsx        ← إدارة الرحلات + إلغاء
│   │       │   ├── subscriptions/page.tsx← إدارة الاشتراكات
│   │       │   ├── drivers/page.tsx      ← إدارة السائقين + مركبات
│   │       │   ├── routes/page.tsx       ← إدارة الخطوط
│   │       │   ├── licenses/page.tsx     ← تتبع الأكواد + فلتر
│   │       │   ├── license_batches/      ← دفعات الأكواد
│   │       │   ├── institutions/page.tsx ← إدارة المؤسسات
│   │       │   ├── analytics/page.tsx    ← تحليلات + Date Range
│   │       │   ├── feature-flags/page.tsx← Feature Flags toggle
│   │       │   └── profiles/             ← إدارة المستخدمين
│   │       ├── components/layout.tsx     ← Sidebar navigation
│   │       └── providers/
│   │           ├── authProvider.ts       ← app_metadata.role فقط
│   │           ├── dataProvider.ts       ← snake_case ↔ camelCase
│   │           └── supabaseClient.ts
│   │
│   └── mobile/                   ← تطبيق Expo
│       ├── app/
│       │   ├── _layout.tsx               ← Auth guard + fonts + offline
│       │   ├── index.tsx                 ← الرئيسية + بحث Nominatim
│       │   ├── booking.tsx               ← تفاصيل الخط
│       │   ├── activate.tsx              ← تفعيل كود (8 أحرف)
│       │   ├── subscriptions.tsx         ← اشتراكاتي + إلغاء RPC
│       │   ├── driver.tsx                ← لوحة السائق
│       │   ├── create-trip.tsx           ← إنشاء رحلة
│       │   ├── tracking/[tripId].tsx     ← خريطة + بيانات السائق
│       │   └── rating/[tripId].tsx       ← تقييم 1-5
│       └── src/
│           ├── hooks/
│           │   ├── useTrips.ts           ← GPS + Realtime + Offline
│           │   ├── useRoutes.ts          ← institution_id filtering
│           │   ├── useNetworkStatus.ts   ← ping() كل 30s
│           │   ├── useFeatureFlags.ts    ← Realtime + logout clear
│           │   └── useStore.ts           ← 4 Zustand stores
│           └── lib/
│               ├── offlineCache.ts       ← AsyncStorage subscription
│               └── logger.ts             ← Structured logger
│
├── packages/
│   └── core/index.ts             ← Zod schemas, state machine, i18n
│
└── supabase/
    ├── functions/
    │   ├── trip-engine/          ← v6: تحديث حالة + Rate Limit
    │   ├── send-notification/    ← v4: Push + multi-device + CORS
    │   ├── zaincash-checkout/    ← stub
    │   └── zaincash-webhook/     ← stub
    └── migrations/               ← 16 migration — مصدر الحقيقة
```

---

## [DATABASE_TABLES]

| الجدول            | الغرض                     | RLS |
| ----------------- | ------------------------- | --- |
| `profiles`        | ملفات المستخدمين          | ✅  |
| `drivers`         | بيانات السائقين والمركبات | ✅  |
| `routes`          | خطوط النقل                | ✅  |
| `subscriptions`   | اشتراكات الطلاب           | ✅  |
| `trips`           | الرحلات الفعلية           | ✅  |
| `licenses`        | أكواد الترخيص             | ✅  |
| `license_batches` | دفعات الأكواد             | ✅  |
| `ratings`         | تقييمات الرحلات           | ✅  |
| `institutions`    | الجامعات والمؤسسات        | ✅  |
| `feature_flags`   | تفعيل/تعطيل الميزات       | ✅  |
| `push_tokens`     | tokens الإشعارات          | ✅  |
| `rate_limits`     | تحديد معدل الطلبات        | ✅  |
| `audit_logs`      | سجل المراجعة              | ✅  |

---

## [RPCS]

| الدالة                                    | الدور    | الغرض                          |
| ----------------------------------------- | -------- | ------------------------------ |
| `activate_license(code)`                  | student  | تفعيل كود + إنشاء subscription |
| `cancel_subscription(id)`                 | student  | إلغاء + استرداد المقعد         |
| `create_trip(route_id, scheduled_at)`     | driver   | إنشاء رحلة                     |
| `update_trip_status(...)`                 | internal | تحديث حالة الرحلة              |
| `update_trip_location(...)`               | driver   | تحديث GPS فقط                  |
| `get_dashboard_stats()`                   | admin    | إحصائيات لوحة التحكم           |
| `get_analytics_summary(start, end)`       | admin    | تحليلات مفصلة                  |
| `create_license_batch(...)`               | admin    | إنشاء دفعة أكواد               |
| `submit_rating(trip_id, rating, comment)` | student  | تقييم رحلة                     |
| `get_driver_avg_rating(driver_id)`        | any      | متوسط تقييم سائق               |
| `check_rate_limit(...)`                   | internal | Rate limiting                  |
| `ping()`                                  | any      | فحص الاتصال                    |
| `log_audit(...)`                          | internal | تسجيل audit                    |
| `get_my_role()`                           | any      | الدور من app_metadata          |

---

## [EDGE_FUNCTIONS]

| الدالة              | الإصدار | الغرض                                        |
| ------------------- | ------- | -------------------------------------------- |
| `trip-engine`       | v6      | تحديث حالة الرحلة + Rate Limit + Idempotency |
| `send-notification` | v4      | Push notifications + multi-device + CORS     |
| `zaincash-checkout` | v2      | بوابة دفع (stub)                             |
| `zaincash-webhook`  | v2      | تأكيد الدفع (stub)                           |

---

## [COMPLETED_PHASES]

- [x] M1: البنية الأساسية — Monorepo، Auth، RLS
- [x] M2: State Machine — Trip lifecycle، GPS tracking
- [x] M3: نظام التراخيص — License batches، activate_license
- [x] M4: المطابقة الذكية — Institution filtering، Ratings
- [x] M5: الأداء — Indexes، pg_cron، Rate Limiting
- [x] M6: Feature Flags، Analytics، Logger، Offline Cache
- [x] M7: إصلاحات أمنية، صفحات Admin المفقودة، cancel_subscription RPC
- [x] M8: تحسينات إضافية — Audit Log viewer، واجهة Admin مثالية ومترجمة بالكامل
- [x] M9: Admin: Push notification broadcast
- [x] M10: Mobile: Student trip history page
- [x] M11: Driver payout system

---

## [PENDING]

- [ ] ZainCash integration (يحتاج credentials)
- [ ] E2E tests تغطية أعلى
- [ ] Error monitoring (Sentry)

---

## [TEST_RESULTS]

```
Unit + Integration (vitest): 123 passed ✅
E2E (playwright): pending
Build (Next.js): ✅ 22 pages
Migrations (production): 16 applied ✅
Edge Functions (production): 4 active ✅
```
