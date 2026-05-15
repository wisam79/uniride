# UniRide v2 — Agent Instructions

> هذا الملف يُوجّه أي AI agent يعمل على المشروع. اقرأه قبل أي تعديل.

---

## 1. نظرة سريعة على المشروع

UniRide هو منصة نقل ذكي للجامعة (العراق). Monorepo بـ pnpm:

```
apps/admin     → Next.js 16 + Refine + MUI (لوحة تحكم)
apps/mobile    → Expo 54 + React Native (تطبيق الطلاب/السائقين)
packages/core  → Zod schemas, i18n, state machine
supabase/      → Edge Functions (Deno) + SQL Migrations (production truth)
```

> ⚠️ `packages/db` (Drizzle) **محذوف** — لا تُضِف أي كود يعتمد عليه.

**لا تبني واجهات UI** — افترض الواجهة مكتملة. ركّز على المنطق الخلفي والحالة.

---

## 2. ⚠️ قواعد أمان حرجة — لا تنتهكها

### 2.1 `app_metadata` وليس `user_metadata`

```typescript
// ❌ خطأ فادح — user_metadata يمكن للعميل تعديله (privilege escalation)
const role = user.user_metadata?.role;

// ✅ صحيح — app_metadata يكتبها admin فقط (خادم)
const role = user.app_metadata?.role;
```

### 2.2 `get_my_role()` بدون fallback

```sql
-- ✅ صحيح — app_metadata فقط
CREATE FUNCTION get_my_role() RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'student'
  );
$$ LANGUAGE sql;
```

---

## 3. 🔴 مصدر الحقيقة لقاعدة البيانات

### 3.1 Supabase Migrations فقط (لا Drizzle)

| النظام                  | الاستخدام                     | مصدر؟                     |
| ----------------------- | ----------------------------- | ------------------------- |
| **Supabase Migrations** | التطبيق الفعلي على production | **المصدر الوحيد للحقيقة** |
| ~~Drizzle Kit~~         | ~~محذوف~~                     | ❌                        |

**مهم جداً:**

- اكتب Migration جديد في `supabase/migrations/` → ثم ارفعه للإنتاج
- `supabase db push` تقرأ من `supabase/migrations/`

### 3.2 تسمية Migrations

```
Pattern: YYYYMMDDNN_description.sql

✅ 2026051110_m5_performance.sql
❌ new_table.sql
❌ 2026051_add_table.sql
```

### 3.3 لا تحمّل كل البيانات بـ `pageSize: 0`

```typescript
// ❌ خطأ — يجلب كل السجلات (أداء سيئ)
useList({ resource: 'profiles', pagination: { pageSize: 0 } });

// ✅ صحيح — استخدم RPC مُحسّن
supabase.rpc('get_dashboard_stats');
```

**RPCs الموجودة:**

- `get_dashboard_stats()` → إحصائيات Dashboard
- `ping()` → فحص الشبكة
- `submit_rating()` → تقييم رحلة
- `activate_license()` → تفعيل ترخيص
- `create_license_batch()` → إنشاء دفعة أكواد
- `create_trip()` → إنشاء رحلة للسائق
- `get_driver_avg_rating()` → متوسط تقييم السائق
- `cancel_subscription()` → إلغاء اشتراك واسترداد المقعد (M7)

---

## 4. 🧵 التزامنية (Concurrency) — Race Conditions

### 4.1 التراخيص تستخدم `FOR UPDATE NOWAIT`

```sql
SELECT * INTO v_license FROM licenses
WHERE code = upper(p_code) AND status = 'active'
FOR UPDATE NOWAIT;
-- إذا كان مقفلاً من مستخدم آخر → NOWAIT يُفشل فوراً (لا انتظار)
```

### 4.2 Idempotency في Edge Functions

كل Edge Function يجب أن يدعم `idempotency-key` header (موجود في `trip-engine`).

---

## 5. 🐢 Rate Limiting — DB-backed فقط

```typescript
// trip-engine: 30 طلب / 60 ثانية
// استخدام: check_rate_limit(p_user_id, 'trip_engine', 30, 60)
```

لا تستخدم `Map()` في الذاكرة — Deno يُعيد التشغيل بشكل متكرر.

---

## 6. 📱 Offline-First

### GPS Queue في AsyncStorage

```typescript
const GPS_QUEUE_KEY = 'gps_offline_queue';
// useLocationTracker في useTrips.ts يدير الـ queue تلقائياً
```

### فحص الشبكة

```typescript
// ✅ ping() RPC — يعمل حتى بدون session
const { error } = await supabase.rpc('ping');
setIsOnline(!error);
```

### اشتراك Offline

```typescript
// OfflineCache في offlineCache.ts
// يتحقق من تاريخ الانتهاء تلقائياً
await OfflineCache.getActiveSubscription();
```

---

## 7. 🔄 State Machine — انتقالات الرحلة

```
scheduled ──► driver_waiting ──► in_transit ──► completed
    │                │                 │
    ▼                ▼                 ▼
cancelled       cancelled          absent
```

```typescript
// packages/core/index.ts
export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return ValidTransitions[from]?.includes(to) ?? false;
}
```

---

## 8. 📱 نظام التراخيص (M3)

بدلاً من الحجز المباشر، يعمل النظام بـ **أكواد ترخيص** مدفوعة مسبقاً:

```
Admin → create_license_batch() → يولّد N كود مشفّر
Student → activate_license(code) → يُنشئ subscription نشطة
```

**لا** تستخدم `reserve_seat()` — تم حذفها.

---

## 9. 🌍 المطابقة الذكية (M4)

```typescript
// الطالب يرى فقط خطوط جامعته
const { routes } = useRoutes(profile?.institution_id);

// institution_id يُحمّل من profiles table في _layout.tsx
// ليس من user_metadata
```

---

## 10. 📡 Realtime — أنماط صحيحة

```typescript
// ✅ صحيح — subscribe مع reconnect handler
.subscribe((status) => {
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    console.warn('[Realtime] reconnecting...');
    fetchData(); // re-fetch بدل الاعتماد على stale cache
  }
});

// ✅ useTripTracking يُعيد fetch كامل (مع joins) عند كل update
// ❌ لا تدمج payload.new مباشرة — يُفقد بيانات routes/driver
```

---

## 11. 📁 بنية الملفات المهمة

```
supabase/migrations/
├── 2026051001_v2_security_and_booking.sql
├── 2026051002_trip_state_machine_and_rls.sql
├── 2026051003_indexes_audit_and_cancel.sql
├── 2026051004_phase0_fixes.sql
├── 2026051005_critical_fixes.sql
├── 2026051106_fix_rate_limit_and_trip_engine.sql
├── 2026051107_infrastructure_and_push.sql
├── 2026051108_license_system.sql
├── 2026051109_ratings_and_ux.sql
├── 2026051110_m5_performance.sql
├── 2026051111_fix_security_and_driver_consistency.sql
├── 2026051112_auto_create_profile_on_signup.sql
├── 2026051113_feature_flags_and_analytics.sql  -- M6: Feature flags + analytics RPC
└── 2026051114_cancel_subscription.sql          -- M7: cancel_subscription() RPC

supabase/functions/
├── trip-engine/index.ts      -- تحديث حالة الرحلة (مع rate limiting)
├── send-notification/        -- إشعارات Expo Push
├── zaincash-checkout/        -- بوابة دفع (stub)
└── zaincash-webhook/         -- تأكيد الدفع (stub)

apps/admin/src/
├── providers/authProvider.ts       -- Auth (app_metadata فقط!)
├── app/page.tsx                    -- Dashboard (get_dashboard_stats RPC)
├── app/drivers/page.tsx            -- إدارة السائقين + is_verified
├── app/license_batches/page.tsx    -- إدارة التراخيص
└── app/licenses/page.tsx           -- تتبع حالة كل كود

apps/mobile/src/
├── hooks/useTrips.ts          -- GPS + Realtime + Offline queue
├── hooks/useRoutes.ts         -- Institution filtering
├── hooks/useNetworkStatus.ts  -- ping() RPC
├── hooks/useStore.ts          -- 4 Zustand stores (auth, trip, booking, i18n)
├── lib/offlineCache.ts        -- Subscription offline cache
└── components/TripMap.tsx     -- OpenStreetMap (free)

apps/mobile/app/
├── index.tsx          -- الرئيسية: خطوط الجامعة + بحث Nominatim
├── activate.tsx       -- تفعيل كود الترخيص
├── create-trip.tsx    -- السائق: إنشاء رحلة
├── rating/[tripId].tsx -- تقييم الرحلة (submit_rating RPC)
└── tracking/[tripId].tsx -- تتبع + خريطة + مشاركة

packages/core/index.ts   -- Zod schemas, state machine, i18n translations
```

---

## 12. 🧪 أوامر الاختبار

```bash
# تطوير
pnpm dev                    # تشغيل كل التطبيقات
pnpm format --write         # تنسيق الكود

# فحص
pnpm typecheck              # TypeScript
pnpm test                   # Unit + Integration (vitest)
pnpm test -- --coverage     # مع التغطية (60% lines, 50% branches/functions)
pnpm test:e2e               # E2E (Playwright)

# بناء
pnpm build                  # بناء كل التطبيقات

# قاعدة البيانات
supabase db push            # رفع migrations
supabase db push --dry-run  # اختبار قبل الرفع

# Edge Functions
supabase functions deploy trip-engine
supabase functions deploy send-notification
supabase functions deploy zaincash-checkout
supabase functions deploy zaincash-webhook
```

---

## 13. 🚀 خط النشر (CI/CD)

```
push to main
    │
    ▼
ci.yml: lint + typecheck + vitest + Next.js build
    │ success
    ▼
deploy.yml: supabase db push + deploy 4 edge functions + set secrets
```

---

## 14. ❌ لا تفعل

| ❌ لا تفعل                           | ✅ افعل بدلاً من ذلك                     |
| ------------------------------------ | ---------------------------------------- |
| `user_metadata.role`                 | `app_metadata.role`                      |
| `pageSize: 0`                        | RPC مُحسّن                               |
| `Map()` للـ rate limiting            | `rate_limits` table                      |
| `routes` query للشبكة                | `ping()` RPC                             |
| استخدام `packages/db`                | كتابة migration جديد                     |
| `console.log`                        | `logger.warn` / `logger.error`           |
| `COALESCE` مع `user_metadata` في SQL | `app_metadata` فقط                       |
| دمج `payload.new` في Realtime        | إعادة fetch كامل                         |
| `reserve_seat()`                     | `activate_license()`                     |
| camelCase في DataGrid columns        | snake_case (dataProvider يحوّل تلقائياً) |

---

## 15. 🔑 Supabase Projects

| البيئة     | ref                    | الملف                  |
| ---------- | ---------------------- | ---------------------- |
| Production | `zpcvvyxtmxzplmojobbv` | `.temp/linked-project` |
| Local dev  | `pfjsqgqrxnrlrfnchnqf` | `.env`                 |

---

## 16. 💡 تلميحات

- **Auth:** `app_metadata.role` مباشرة من JWT — لا تستعلم عن DB لتحديد الدور
- **Realtime:** جميع channels تدعم auto-reconnect عند `CHANNEL_ERROR`/`TIMED_OUT`
- **Zustand Stores:** auth, trip, booking, i18n — كلها مع AsyncStorage persistence
- **Institution Matching:** `profile.institution_id` يُحمّل من `profiles` table في `_layout.tsx`
- **Ratings:** مُقيّد بـ `UNIQUE(trip_id, student_id)` في DB + فحص في RPC
- **ZainCash:** stubs جاهزة — تحتاج `ZAINCASH_SECRET`, `ZAINCASH_MSISDN`, `ZAINCASH_MERCHANT_ID`
- **dataProvider:** يحوّل snake_case ↔ camelCase تلقائياً — لا تضع camelCase في columns
- **Feature Flags:** `useFeatureFlags()` hook — يدعم live updates عبر Realtime
- **Logger:** استخدم `logger.info/warn/error` بدلاً من `console.*`

---

## 17. 📁 ملفات جديدة (M7)

```
apps/admin/src/
├── app/trips/page.tsx                 -- إدارة الرحلات مع إلغاء يدوي + Realtime
├── app/subscriptions/page.tsx         -- إدارة الاشتراكات مع أسماء بدلاً من UUIDs
├── app/feature-flags/page.tsx         -- إدارة Feature Flags مع toggle مباشر
├── providers/dataProvider.ts          -- snake_case ↔ camelCase wrapper
├── app/institutions/page.tsx          -- إدارة المؤسسات
└── app/analytics/page.tsx             -- Analytics dashboard مع Date Range Picker

apps/mobile/src/
├── hooks/useFeatureFlags.ts           -- Feature flags مع Realtime + cache clear on logout
└── lib/logger.ts                      -- Structured logger

supabase/migrations/
├── 2026051113_feature_flags_and_analytics.sql  -- Feature flags + analytics RPC
└── 2026051114_cancel_subscription.sql          -- cancel_subscription() RPC آمن
```

---

## 18. 🧪 الاختبارات (M6)

```bash
pnpm test   # 123 اختبار — كلها تمر

# ملفات الاختبار:
packages/core/index.test.ts                        # 37 اختبار — state machine + schemas + i18n
apps/admin/src/providers/authProvider.test.ts      # 12 اختبار — auth security
apps/admin/src/providers/dataProvider.test.ts      # 5 اختبارات — snake↔camel
apps/mobile/src/hooks/useTrips.test.ts             # 5 اختبارات — GPS queue
apps/mobile/src/hooks/useFeatureFlags.test.ts      # 3 اختبارات — feature flags
apps/mobile/src/lib/offlineCache.test.ts           # 7 اختبارات — offline cache
apps/mobile/src/lib/logger.test.ts                 # 8 اختبارات — logger
```

---

> **آخر تحديث:** Phase M7 (2026-05-12)
> **Migration الحالي:** `2026051114_cancel_subscription.sql`
> **الإصدار:** UniRide v3.0 — جاهز للنشر
> **تغطية الاختبارات:** 123 اختبار ✅
