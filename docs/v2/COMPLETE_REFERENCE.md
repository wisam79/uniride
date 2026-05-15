# UniRide v3 — المرجع الشامل

> **الإصدار:** v3.0.0 | **آخر تحديث:** 2026-05-12 | **الاختبارات:** 123/123 ✅

---

## الفهرس

1. [نظرة عامة](#1-نظرة-عامة)
2. [البنية المعمارية](#2-البنية-المعمارية)
3. [قاعدة البيانات](#3-قاعدة-البيانات)
4. [الأمان](#4-الأمان)
5. [Edge Functions](#5-edge-functions)
6. [State Machine](#6-state-machine)
7. [إدارة الحالة والـ Offline](#7-إدارة-الحالة-والـ-offline)
8. [لوحة التحكم](#8-لوحة-التحكم)
9. [التطبيق المحمول](#9-التطبيق-المحمول)
10. [CI/CD](#10-cicd)
11. [الأوامر المرجعية](#11-الأوامر-المرجعية)

---

## 1. نظرة عامة

### 1.1 ما هو UniRide؟

منصة نقل ذكي للطلاب الجامعيين في العراق. تربط الطلاب بالسائقين عبر:

- **نظام تراخيص مدفوعة مسبقاً** — بدلاً من الحجز المباشر
- **تتبع GPS حي** — مع دعم offline
- **إشعارات فورية** — عبر Expo Push API
- **Feature Flags** — تفعيل/تعطيل الميزات بدون نشر

### 1.2 أدوار المستخدمين

| الدور     | الصلاحيات                                           |
| --------- | --------------------------------------------------- |
| `admin`   | لوحة تحكم كاملة، إدارة جميع الكيانات، Feature Flags |
| `student` | تفعيل ترخيص، تتبع الرحلة، تقييم السائق              |
| `driver`  | إنشاء رحلة، تحديث الحالة، إرسال GPS                 |

### 1.3 التقنيات

| الطبقة    | التقنية                        |
| --------- | ------------------------------ |
| Admin     | Next.js 16.2.6 + Refine + MUI  |
| Mobile    | Expo 54 + React Native         |
| Core      | TypeScript 5.4.5 + Zod         |
| Database  | Supabase PostgreSQL            |
| Functions | Deno (Supabase Edge Functions) |
| Testing   | Vitest + Playwright            |

---

## 2. البنية المعمارية

### 2.1 هيكل Monorepo

```
uniride/
├── apps/admin/          ← Next.js لوحة التحكم
├── apps/mobile/         ← Expo تطبيق الطلاب/السائقين
├── packages/core/       ← Zod schemas, state machine, i18n
└── supabase/            ← Edge Functions + SQL Migrations
```

### 2.2 تدفق البيانات

```
Client Request
    ↓
Supabase Auth (JWT verification)
    ↓
app_metadata.role (لا user_metadata)
    ↓
Row Level Security (RLS)
    ↓
PostgreSQL RPC / Table
    ↓
JSON Response
```

### 2.3 قرارات التصميم الرئيسية

**لماذا نظام التراخيص؟**

- لا حاجة لبوابة دفع في المرحلة الأولى
- `FOR UPDATE NOWAIT` يمنع استخدام نفس الكود مرتين
- Admin يتحكم في التوزيع خارج النظام

**لماذا `app_metadata` وليس `user_metadata`؟**

- `user_metadata` قابل للتعديل من العميل → ثغرة Privilege Escalation
- `app_metadata` يكتبها Service Role فقط → آمن

**لماذا DB-backed Rate Limiting؟**

- Deno cold starts تمسح `Map()` في الذاكرة
- `rate_limits` table يبقى بين cold starts

---

## 3. قاعدة البيانات

### 3.1 الجداول

#### `profiles`

```sql
id              UUID PRIMARY KEY (FK auth.users)
full_name       TEXT NOT NULL
phone           TEXT NOT NULL
role            TEXT CHECK (role IN ('admin','student','driver'))
institution_id  UUID NULL (FK institutions.id)
is_verified     BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `drivers`

```sql
id              UUID PRIMARY KEY
user_id         UUID UNIQUE (FK profiles.id)
license_number  TEXT NOT NULL
vehicle_model   TEXT NOT NULL
vehicle_plate   TEXT NOT NULL
capacity        INT DEFAULT 40
is_verified     BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
```

#### `routes`

```sql
id              UUID PRIMARY KEY
driver_id       UUID (FK drivers.id)  ← drivers.id وليس auth.uid()
institution_id  UUID NULL (FK institutions.id)
title           TEXT NOT NULL
start_location  TEXT NOT NULL
end_location    TEXT NOT NULL
price           BIGINT NOT NULL  ← بالدينار العراقي
capacity        INT NOT NULL
available_seats INT NOT NULL CHECK (available_seats >= 0)
is_active       BOOLEAN DEFAULT true
start_lat/lng   NUMERIC NULL
end_lat/lng     NUMERIC NULL
departure_time  TIME NULL
return_time     TIME NULL
```

#### `subscriptions`

```sql
id              UUID PRIMARY KEY
student_id      UUID (FK profiles.id)
route_id        UUID (FK routes.id)
status          TEXT CHECK (status IN ('pending','active','expired','cancelled'))
start_date      DATE NOT NULL
end_date        DATE NOT NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `trips`

```sql
id              UUID PRIMARY KEY
route_id        UUID (FK routes.id)
driver_id       UUID (FK drivers.id)  ← drivers.id وليس auth.uid()
status          TEXT DEFAULT 'scheduled'
scheduled_at    TIMESTAMPTZ NOT NULL
started_at      TIMESTAMPTZ NULL
ended_at        TIMESTAMPTZ NULL
last_lat        NUMERIC(10,7) NULL
last_lng        NUMERIC(10,7) NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `licenses`

```sql
id              UUID PRIMARY KEY
batch_id        UUID (FK license_batches.id)
route_id        UUID (FK routes.id)
code            TEXT UNIQUE NOT NULL  ← 8 أحرف عشوائية
status          TEXT CHECK (status IN ('active','used','revoked'))
used_by         UUID NULL (FK profiles.id)
used_at         TIMESTAMPTZ NULL
valid_days      INT NOT NULL
created_at      TIMESTAMPTZ
```

#### `license_batches`

```sql
id              UUID PRIMARY KEY
created_by      UUID (FK profiles.id)
route_id        UUID (FK routes.id)
batch_name      TEXT NOT NULL
quantity        INT NOT NULL
price           NUMERIC NOT NULL
valid_days      INT NOT NULL
created_at      TIMESTAMPTZ
```

#### `ratings`

```sql
id              UUID PRIMARY KEY
trip_id         UUID (FK trips.id)
student_id      UUID (FK profiles.id)
driver_id       UUID (FK auth.users.id)  ← auth.users.id وليس drivers.id
rating          INT CHECK (rating BETWEEN 1 AND 5)
comment         TEXT NULL
created_at      TIMESTAMPTZ
UNIQUE(trip_id, student_id)
```

#### `institutions`

```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
city            TEXT NULL
created_at      TIMESTAMPTZ
```

#### `feature_flags`

```sql
id              UUID PRIMARY KEY
name            TEXT UNIQUE NOT NULL
enabled         BOOLEAN DEFAULT false
description     TEXT NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `push_tokens`

```sql
id              UUID PRIMARY KEY
user_id         UUID (FK auth.users.id)
token           TEXT NOT NULL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `rate_limits`

```sql
id              UUID PRIMARY KEY
user_id         UUID (FK auth.users.id)
action          TEXT NOT NULL
window_start    TIMESTAMPTZ DEFAULT NOW()
request_count   INT DEFAULT 1
```

#### `audit_logs`

```sql
id              UUID PRIMARY KEY
user_id         UUID (FK auth.users.id)
action          TEXT NOT NULL
resource        TEXT NOT NULL
resource_id     UUID NULL
details         JSONB NULL
created_at      TIMESTAMPTZ
```

### 3.2 العلاقات المهمة

```
⚠️ trips.driver_id → drivers.id (وليس auth.uid())
⚠️ routes.driver_id → drivers.id (وليس auth.uid())
⚠️ ratings.driver_id → auth.users.id (وليس drivers.id)
```

هذا التمييز مهم جداً — `drivers.id` ≠ `auth.uid()`.

### 3.3 الـ Triggers

| Trigger                             | الجدول     | الوظيفة                                  |
| ----------------------------------- | ---------- | ---------------------------------------- |
| `set_trips_updated_at`              | trips      | تحديث updated_at تلقائياً                |
| `on_auth_user_created`              | auth.users | إنشاء profile تلقائياً عند التسجيل       |
| `enforce_profile_privileged_fields` | profiles   | يمنع تغيير role/is_verified إلا من admin |

### 3.4 pg_cron Jobs

```sql
-- كل ساعة: تنظيف rate_limits القديمة
SELECT cron.schedule('cleanup-rate-limits', '0 * * * *',
  'SELECT cleanup_rate_limits()');
```

---

## 4. الأمان

### 4.1 JWT Claims

```typescript
// الدور من app_metadata فقط
const role = user.app_metadata?.role; // 'admin' | 'student' | 'driver'

// في SQL
auth.jwt() -> 'app_metadata' ->> 'role'
auth.uid()  // UUID المستخدم
```

### 4.2 RLS الرئيسية

```sql
-- profiles: المستخدم يرى ملفه، admin يرى الكل
-- subscriptions: الطالب يرى اشتراكاته فقط
-- trips: السائق يرى رحلاته، admin يرى الكل
-- feature_flags: الكل يقرأ، admin فقط يعدّل
-- rate_limits: لا وصول مباشر (DENY ALL)
```

### 4.3 التزامنية

```sql
-- activate_license: FOR UPDATE NOWAIT
-- cancel_subscription: FOR UPDATE
-- لا race conditions في العمليات الحساسة
```

### 4.4 Rate Limiting

```
trip-engine: 30 طلب / 60 ثانية
```

### 4.5 Idempotency

```
trip-engine يدعم idempotency-key header
يتحقق من audit_logs قبل التنفيذ
```

---

## 5. Edge Functions

### `trip-engine` (v6)

- **الغرض:** تحديث حالة الرحلة
- **الأمان:** JWT + Rate Limit + Idempotency + CORS
- **CORS:** ADMIN_URL + Expo origins فقط

### `send-notification` (v4)

- **الغرض:** Push notifications عبر Expo
- **الجديد:** Multi-device support + CORS hardening
- **القيود:** admin/driver فقط، driver محدود بطلابه

### `zaincash-checkout` / `zaincash-webhook`

- **الحالة:** Stubs — تحتاج credentials

---

## 6. State Machine

### Trip Transitions

```
scheduled → driver_waiting → in_transit → completed
    ↓              ↓              ↓
cancelled      cancelled       absent
```

### Subscription Transitions

```
pending → active → expired
   ↓         ↓
cancelled  cancelled
```

### License Transitions

```
active → used
   ↓
revoked
```

---

## 7. إدارة الحالة والـ Offline

### Zustand Stores (Mobile)

```typescript
useAuthStore; // user, role, profile, institution_id
useTripStore; // activeTripId, currentStatus
useBookingStore; // isBooking, idempotencyKey
useI18nStore; // language (ar/en)
```

### GPS Offline Queue

```
[متصل]     → update_trip_location() RPC مباشرة
[غير متصل] → AsyncStorage (gps_offline_queue)
             → flush بعد 5 ثوانٍ من عودة الاتصال
             → max 3 retries لكل item
             → validation: lat ∈ [-90,90], lng ∈ [-180,180]
```

### Subscription Offline Cache

```typescript
// يُحفظ في AsyncStorage عند كل fetch
await OfflineCache.saveActiveSubscription(activeSub);

// يُقرأ عند انقطاع الاتصال
const sub = await OfflineCache.getActiveSubscription();
// يتحقق من end_date تلقائياً
```

### Feature Flags Cache

```typescript
// module-level cache
let cachedFlags: Record<string, boolean> | null = null;

// يُمسح عند logout
useEffect(() => {
  if (!user) {
    cachedFlags = null;
  }
}, [user]);
```

---

## 8. لوحة التحكم

### الصفحات

| الصفحة             | الميزات                                    |
| ------------------ | ------------------------------------------ |
| `/` Dashboard      | إحصائيات، auto-refresh 30s، زر refresh     |
| `/trips`           | جدول الرحلات، فلتر الحالة، إلغاء يدوي      |
| `/subscriptions`   | جدول الاشتراكات، أسماء بدلاً من UUIDs      |
| `/drivers`         | بيانات المركبة الكاملة، toggle is_verified |
| `/routes`          | الخطوط، اسم السائق                         |
| `/licenses`        | فلتر status + batch + quick search         |
| `/license_batches` | إنشاء دفعات عبر create_license_batch()     |
| `/institutions`    | CRUD المؤسسات                              |
| `/analytics`       | Date Range Picker، KPIs، Top Routes        |
| `/feature-flags`   | Toggle مباشر، Realtime                     |
| `/profiles`        | عرض المستخدمين، اسم المؤسسة                |

### قاعدة DataGrid

```typescript
// snake_case دائماً — dataProvider يحوّل تلقائياً
{
  field: 'full_name';
} // ✅
{
  field: 'fullName';
} // ❌
```

---

## 9. التطبيق المحمول

### الشاشات

| الشاشة              | الوصف                                                   |
| ------------------- | ------------------------------------------------------- |
| `index.tsx`         | خطوط الجامعة (مفلترة بـ institution_id) + بحث Nominatim |
| `booking.tsx`       | تفاصيل الخط → redirect لـ activate                      |
| `activate.tsx`      | إدخال كود 8 أحرف → activate_license()                   |
| `subscriptions.tsx` | اشتراكاتي + تتبع + cancel_subscription()                |
| `driver.tsx`        | لوحة السائق + تحديث الحالة عبر trip-engine              |
| `create-trip.tsx`   | إنشاء رحلة عبر create_trip()                            |
| `tracking/[tripId]` | خريطة OpenStreetMap + موقع السائق                       |
| `rating/[tripId]`   | تقييم 1-5 عبر submit_rating()                           |

### Hooks الرئيسية

```typescript
useActiveTrips(institutionId); // مفلترة بمؤسسة الطالب
useDriverTrips(page); // رحلات السائق مع pagination
useTripTracking(tripId); // Realtime + joins كاملة
useLocationTracker(); // GPS + offline queue
useSubscriptions(page); // مع offline fallback
useRoutes(institutionId, page); // مفلترة + Realtime
useNetworkStatus(); // ping() كل 30 ثانية
useFeatureFlags(); // Realtime + cache clear
```

---

## 10. CI/CD

### Workflows

```
ci.yml:     lint → typecheck → vitest → Next.js build
deploy.yml: supabase db push → deploy 4 functions → set secrets
e2e.yml:    Playwright API tests
security.yml: pnpm audit + SQL review (weekly)
```

### Branch Protection

```
main: PR required + 1 approval + CI passed + linear history
```

---

## 11. الأوامر المرجعية

```bash
# تطوير
pnpm install                    # تثبيت الحزم
pnpm dev                        # تشغيل كل التطبيقات
pnpm --filter admin-dashboard dev  # لوحة التحكم فقط
pnpm --filter mobile-app start     # التطبيق المحمول فقط

# جودة الكود
pnpm format --write             # تنسيق الكود
pnpm typecheck                  # فحص TypeScript
pnpm test                       # 123 اختبار
pnpm test -- --coverage         # مع التغطية
pnpm test:e2e                   # E2E

# بناء
pnpm build                      # بناء كل التطبيقات
pnpm --filter admin-dashboard build  # لوحة التحكم فقط

# قاعدة البيانات
supabase db push --dry-run      # اختبار قبل التطبيق
supabase db push                # تطبيق migrations
supabase migration list         # قائمة الـ migrations

# Edge Functions
supabase functions deploy trip-engine
supabase functions deploy send-notification
supabase functions deploy zaincash-checkout
supabase functions deploy zaincash-webhook

# Secrets
supabase secrets set ADMIN_URL=https://your-domain.com
supabase secrets set ZAINCASH_SECRET=...
```

---

## الملحق: قائمة "لا تفعل"

| ❌ لا تفعل                     | ✅ افعل بدلاً من ذلك         |
| ------------------------------ | ---------------------------- |
| `user_metadata.role`           | `app_metadata.role`          |
| `pageSize: 0`                  | RPC مُحسّن                   |
| `Map()` للـ rate limiting      | `rate_limits` table          |
| `console.log/warn`             | `logger.info/warn/error`     |
| `packages/db` (Drizzle)        | كتابة migration جديد         |
| دمج `payload.new` في Realtime  | إعادة fetch كاملة            |
| `reserve_seat()`               | `activate_license()`         |
| camelCase في DataGrid          | snake_case                   |
| `auth.uid()` كـ driver_id      | `drivers.id` من جدول drivers |
| `*` في CORS                    | قائمة origins محددة          |
| `anon` يستدعي SECURITY DEFINER | `REVOKE EXECUTE FROM anon`   |
