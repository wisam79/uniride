# 🏗️ البنية المعمارية — UniRide v3

---

## 1. فلسفة التصميم

UniRide v3 يتبع مبادئ **Clean Architecture** مع تركيز على:

- **Database as Source of Truth** — قاعدة البيانات هي المرجع، لا الكود
- **Security by Default** — كل طبقة تتحقق بشكل مستقل
- **Offline-First** — التطبيق يعمل بدون إنترنت
- **Atomic Operations** — لا race conditions في العمليات الحساسة

---

## 2. الطبقات المعمارية

```
┌─────────────────────────────────────────────────────────┐
│              Presentation Layer                         │
│   apps/admin (Next.js)    apps/mobile (Expo)           │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              Core Layer (packages/core)                 │
│   Zod Schemas · State Machine · i18n · Types           │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              Service Layer (supabase/functions)         │
│   trip-engine · send-notification · zaincash-*         │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              Data Layer (Supabase PostgreSQL)           │
│   RLS Policies · RPCs · Triggers · Migrations          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. تدفق البيانات

```
طلب من Mobile/Admin
        │
        ▼
Supabase Auth (JWT verification)
        │
        ▼
Row Level Security (RLS)
  ← يقرأ app_metadata.role من JWT
  ← لا يستعلم DB لتحديد الدور
        │
        ▼
PostgreSQL RPC / Table Query
        │
        ▼
استجابة JSON
```

---

## 4. قرارات التصميم الرئيسية

### 4.1 لماذا نظام التراخيص بدلاً من الحجز المباشر؟

**المشكلة:** الحجز المباشر يتطلب بوابة دفع متكاملة وتحقق فوري.

**الحل:** أكواد ترخيص مدفوعة مسبقاً:

```
Admin → create_license_batch(N codes) → يوزع الأكواد خارج النظام
Student → activate_license(code)      → يُنشئ subscription نشطة فوراً
```

**المزايا:**

- لا حاجة لبوابة دفع في المرحلة الأولى
- يمنع الاحتيال (الكود يُستخدم مرة واحدة فقط)
- `FOR UPDATE NOWAIT` يمنع استخدام نفس الكود مرتين

### 4.2 لماذا `app_metadata` وليس `user_metadata`؟

```typescript
// ❌ خطر أمني — user_metadata قابل للتعديل من العميل
const role = user.user_metadata?.role;

// ✅ آمن — app_metadata يكتبها admin فقط عبر Service Role
const role = user.app_metadata?.role;
```

`user_metadata` يمكن لأي مستخدم تعديله عبر `supabase.auth.updateUser()` — هذا يعني أي طالب يمكنه ترقية نفسه لـ admin.

### 4.3 لماذا Supabase Migrations وليس Drizzle؟

| المعيار          | Supabase Migrations   | Drizzle  |
| ---------------- | --------------------- | -------- |
| مصدر الحقيقة     | ✅ نعم                | ❌ لا    |
| يعمل مع RLS      | ✅ كامل               | ⚠️ محدود |
| يعمل مع Triggers | ✅ كامل               | ⚠️ محدود |
| CI/CD            | ✅ `supabase db push` | ❌ معقد  |

`packages/db` (Drizzle) **محذوف** من المشروع — لا تُضِف أي كود يعتمد عليه.

### 4.4 لماذا DB-backed Rate Limiting؟

```typescript
// ❌ خطأ — Deno يُعيد التشغيل بشكل متكرر (cold starts)
const rateLimitMap = new Map<string, number>();

// ✅ صحيح — يبقى بين cold starts
await supabase.rpc('check_rate_limit', {
  p_user_id: user.id,
  p_action: 'trip_engine',
  p_limit: 30,
  p_window_seconds: 60,
});
```

### 4.5 لماذا إعادة fetch كاملة في Realtime؟

```typescript
// ❌ خطأ — payload.new لا يحتوي على joins
channel.on('postgres_changes', ..., (payload) => {
  setTrip(payload.new); // يفقد بيانات routes/driver
});

// ✅ صحيح — إعادة fetch مع كل الـ joins
channel.on('postgres_changes', ..., () => {
  fetchTrip(); // يجلب trip + routes + driver معاً
});
```

---

## 5. بنية لوحة التحكم (Admin)

```
apps/admin/src/
├── app/                    ← Next.js App Router
│   ├── page.tsx            ← Dashboard (auto-refresh 30s)
│   ├── trips/              ← إدارة الرحلات + إلغاء يدوي
│   ├── subscriptions/      ← إدارة الاشتراكات
│   ├── drivers/            ← إدارة السائقين + بيانات المركبة
│   ├── routes/             ← إدارة الخطوط
│   ├── licenses/           ← تتبع الأكواد + فلتر متقدم
│   ├── license_batches/    ← إنشاء دفعات الأكواد
│   ├── institutions/       ← إدارة المؤسسات
│   ├── analytics/          ← تحليلات مع Date Range Picker
│   ├── feature-flags/      ← تفعيل/تعطيل الميزات (Realtime)
│   └── profiles/           ← إدارة المستخدمين
│
└── providers/
    ├── authProvider.ts     ← يتحقق من app_metadata.role = 'admin'
    ├── dataProvider.ts     ← يحوّل snake_case ↔ camelCase تلقائياً
    └── supabaseClient.ts   ← Supabase client instance
```

**قاعدة مهمة:** DataGrid columns يجب أن تستخدم `snake_case` — dataProvider يحوّل تلقائياً.

```typescript
// ❌ خطأ — لن تظهر البيانات
{ field: 'fullName', headerName: 'Full Name' }

// ✅ صحيح
{ field: 'full_name', headerName: 'Full Name' }
```

---

## 6. بنية التطبيق المحمول (Mobile)

```
apps/mobile/
├── app/                    ← Expo Router screens
│   ├── _layout.tsx         ← Auth guard + font loading + offline banner
│   ├── index.tsx           ← الرئيسية: خطوط الجامعة + بحث Nominatim
│   ├── booking.tsx         ← تفاصيل الخط → redirect لـ activate
│   ├── activate.tsx        ← تفعيل كود الترخيص (8 أحرف)
│   ├── subscriptions.tsx   ← اشتراكاتي + تتبع + إلغاء
│   ├── driver.tsx          ← لوحة السائق + تحديث الحالة
│   ├── create-trip.tsx     ← إنشاء رحلة جديدة
│   ├── tracking/[tripId]   ← خريطة OpenStreetMap + بيانات السائق
│   └── rating/[tripId]     ← تقييم 1-5 نجوم
│
└── src/
    ├── hooks/
    │   ├── useTrips.ts         ← GPS queue + Realtime + Offline fallback
    │   ├── useRoutes.ts        ← فلترة بـ institution_id
    │   ├── useNetworkStatus.ts ← ping() كل 30 ثانية
    │   ├── useFeatureFlags.ts  ← Realtime + cache clear on logout
    │   ├── useStore.ts         ← 4 Zustand stores
    │   └── useTranslation.ts   ← AR/EN + RTL
    └── lib/
        ├── offlineCache.ts     ← AsyncStorage subscription cache
        └── logger.ts           ← Structured logger → log-error function
```

---

## 7. قاعدة البيانات — الجداول الرئيسية

```
auth.users (Supabase managed)
    │
    └── profiles (1:1)
            │
            ├── drivers (1:1)
            │       │
            │       └── routes (1:M)
            │               │
            │               ├── subscriptions (M:1) ← students
            │               ├── trips (1:M)
            │               └── license_batches (1:M)
            │                       │
            │                       └── licenses (1:M)
            │
            └── subscriptions (1:M) ← كمسافر
                    │
                    └── ratings (1:1 per trip)

feature_flags (standalone)
rate_limits (standalone)
audit_logs (standalone)
push_tokens (standalone)
institutions (standalone)
```

---

## 8. الـ Migrations — التسلسل الزمني

| الرقم       | الاسم                               | المحتوى                            |
| ----------- | ----------------------------------- | ---------------------------------- |
| 2026051001  | v2_security_and_booking             | RLS الأساسي، reserve_seat          |
| 2026051002  | trip_state_machine_and_rls          | state machine، RLS للرحلات         |
| 2026051003  | indexes_audit_and_cancel            | indexes، audit_logs                |
| 2026051004  | phase0_fixes                        | GPS RPC، pg_cron                   |
| 2026051005  | critical_fixes                      | RPCs، indexes، RLS                 |
| 2026051006  | enforce_driver_verification         | التحقق من السائق                   |
| 2026051106  | fix_rate_limit_and_trip_engine      | Rate limiting DB-backed            |
| 2026051107  | infrastructure_and_push             | push_tokens، إشعارات               |
| 2026051108  | license_system                      | نظام التراخيص الكامل               |
| 2026051109  | ratings_and_ux                      | التقييمات، المؤسسات                |
| 2026051110  | m5_performance                      | indexes، RLS institutions          |
| 2026051111  | fix_security_and_driver_consistency | app_metadata، driver identity      |
| 2026051112  | auto_create_profile_on_signup       | trigger تلقائي                     |
| 20260512... | feature_flags_and_analytics         | feature_flags table، analytics RPC |
| 20260512... | cancel_subscription                 | cancel_subscription() RPC          |
| 20260512... | security_hardening_m7               | revoke anon، search_path           |

---

## 9. CI/CD Pipeline

```
push to main
    │
    ▼
ci.yml
├── lint + format check
├── typecheck (TypeScript)
├── vitest (123 tests, 60% coverage)
└── Next.js build
    │ success
    ▼
deploy.yml
├── supabase db push (migrations)
├── deploy trip-engine
├── deploy send-notification
├── deploy zaincash-checkout
└── deploy zaincash-webhook
```
