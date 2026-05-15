# 🤝 دليل المساهمة — UniRide v3

---

## 1. استراتيجية الفروع

```
main          ← production فقط، محمي
  │
  ├── feature/add-payment-gateway
  ├── fix/gps-queue-overflow
  └── chore/update-dependencies
```

**قواعد:**

- لا تدفع مباشرة لـ `main`
- كل PR يحتاج موافقة واحدة على الأقل
- CI يجب أن ينجح قبل الـ merge

---

## 2. معايير الكود

### TypeScript

```typescript
// ❌ ممنوع — any type
const data: any = response.data;

// ✅ صحيح — استخدم types من @uniride/core
import { Trip, TripStatus } from '@uniride/core';
const trip: Trip = response.data;
```

### Logging

```typescript
// ❌ ممنوع
console.log('trip updated');
console.warn('error:', err);

// ✅ صحيح
import { logger } from '../lib/logger';
logger.info('trip updated', { tripId });
logger.warn('GPS error', { error: err.message });
logger.error('Critical failure', { error: err });
```

### Supabase Queries

```typescript
// ❌ ممنوع — يجلب كل البيانات
const { data } = await supabase.from('profiles').select('*');

// ✅ صحيح — حدد الأعمدة المطلوبة
const { data } = await supabase
  .from('profiles')
  .select('id, full_name, role')
  .eq('id', userId)
  .single();
```

### DataGrid Columns (Admin)

```typescript
// ❌ ممنوع — camelCase لن يعمل مع dataProvider
{ field: 'fullName', headerName: 'Full Name' }

// ✅ صحيح — snake_case دائماً
{ field: 'full_name', headerName: 'Full Name' }
```

---

## 3. قواعد قاعدة البيانات

### تسمية Migrations

```
Pattern: YYYYMMDDNN_description.sql

✅ 2026051201_add_notifications_table.sql
✅ 2026051202_fix_rls_policies.sql
❌ new_table.sql
❌ fix.sql
❌ 2026051_add_table.sql
```

### محتوى Migration

```sql
-- ✅ دائماً استخدم IF NOT EXISTS / OR REPLACE
CREATE TABLE IF NOT EXISTS my_table (...);
CREATE OR REPLACE FUNCTION my_func() ...;
CREATE INDEX IF NOT EXISTS idx_name ON table(column);

-- ✅ فعّل RLS على كل جدول جديد
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- ✅ أضف policies
CREATE POLICY "..." ON my_table FOR SELECT USING (...);

-- ✅ ثبّت search_path على functions
ALTER FUNCTION my_func() SET search_path = public;
```

### ممنوعات في Migrations

```sql
-- ❌ لا تستخدم user_metadata للأدوار
auth.jwt() -> 'user_metadata' ->> 'role'

-- ❌ لا تستخدم reserve_seat() — محذوفة
-- ❌ لا تستخدم packages/db (Drizzle) — محذوف
```

---

## 4. كتابة الاختبارات

### اختبارات الوحدة (Vitest)

```typescript
// packages/core/index.test.ts — نموذج
describe('canTransition', () => {
  it('allows scheduled → driver_waiting', () => {
    expect(canTransition('scheduled', 'driver_waiting')).toBe(true);
  });

  it('rejects completed → scheduled', () => {
    expect(canTransition('completed', 'scheduled')).toBe(false);
  });
});
```

**ملفات الاختبار الحالية:**

| الملف                                           | الاختبارات | المحتوى                      |
| ----------------------------------------------- | ---------- | ---------------------------- |
| `packages/core/index.test.ts`                   | 37         | state machine, schemas, i18n |
| `apps/admin/src/providers/authProvider.test.ts` | 12         | auth security                |
| `apps/admin/src/providers/dataProvider.test.ts` | 5          | snake↔camel                  |
| `apps/mobile/src/hooks/useTrips.test.ts`        | 5          | GPS queue                    |
| `apps/mobile/src/hooks/useFeatureFlags.test.ts` | 3          | feature flags                |
| `apps/mobile/src/lib/offlineCache.test.ts`      | 7          | offline cache                |
| `apps/mobile/src/lib/logger.test.ts`            | 8          | logger                       |

### متطلبات التغطية

```
lines:     60%
branches:  50%
functions: 50%
```

### تشغيل الاختبارات

```bash
pnpm test                    # كل الاختبارات
pnpm test -- --coverage      # مع تقرير التغطية
pnpm test -- --watch         # وضع المراقبة
pnpm test:e2e                # E2E (Playwright)
```

---

## 5. Pre-commit Hooks

Husky + Lint-Staged يعملان تلقائياً عند `git commit`:

```bash
# ما يحدث تلقائياً:
prettier --write "**/*.{ts,tsx,json}"  # تنسيق الكود
```

إذا فشل الـ commit:

```bash
pnpm format --write  # تنسيق يدوي
git add .
git commit -m "..."  # أعد المحاولة
```

---

## 6. سير عمل PR

```bash
# 1. أنشئ فرع
git checkout -b feature/my-feature

# 2. اكتب الكود

# 3. تأكد من الجودة
pnpm format --write
pnpm typecheck
pnpm test

# 4. ارفع الفرع
git push -u origin feature/my-feature

# 5. أنشئ PR
gh pr create --title "feat: add my feature" --body "..."
```

### معايير PR

- **العنوان:** يتبع [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` ميزة جديدة
  - `fix:` إصلاح bug
  - `chore:` تحديث dependencies أو إعدادات
  - `docs:` تحديث توثيق
  - `refactor:` إعادة هيكلة بدون تغيير وظيفي

- **الوصف:** يجب أن يشرح:
  - ماذا تغيّر؟
  - لماذا؟
  - كيف تم الاختبار؟

---

## 7. الحدود المعمارية

```
✅ مسموح:
packages/core → لا imports من apps/*
apps/admin    → يستورد من packages/core
apps/mobile   → يستورد من packages/core

❌ ممنوع:
apps/mobile   → يستورد من apps/admin
packages/core → يستورد من apps/*
```

---

## 8. قائمة التحقق قبل PR

- [ ] `pnpm typecheck` ينجح بدون أخطاء
- [ ] `pnpm test` ينجح (123+ اختبار)
- [ ] `pnpm format --write` مُطبَّق
- [ ] لا `console.log` أو `console.warn` — استخدم `logger`
- [ ] لا `any` types
- [ ] Migration جديد يتبع نمط التسمية الصحيح
- [ ] Migration جديد يحتوي على RLS policies
- [ ] لا `.env` في الـ diff
- [ ] لا `user_metadata.role` — استخدم `app_metadata.role`
- [ ] لا `pageSize: 0` — استخدم RPC
