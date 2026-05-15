# 🛡️ دليل الأمان — UniRide v3

---

## 1. نموذج الأمان — الطبقات الست

```
الطبقة 1: Supabase Auth (JWT tokens)
    ↓
الطبقة 2: app_metadata.role (وليس user_metadata)
    ↓
الطبقة 3: Row Level Security (RLS) على كل الجداول
    ↓
الطبقة 4: Edge Function Auth Verification
    ↓
الطبقة 5: Rate Limiting (DB-backed)
    ↓
الطبقة 6: Input Validation (Zod schemas)
```

---

## 2. `app_metadata` مقابل `user_metadata` — قاعدة لا تُكسر

### المشكلة

```typescript
// ❌ ثغرة أمنية حرجة — Privilege Escalation
// أي مستخدم يمكنه تنفيذ هذا:
await supabase.auth.updateUser({ data: { role: 'admin' } });
// الآن user_metadata.role = 'admin' !

const role = user.user_metadata?.role; // يقرأ 'admin' ← خطر
```

### الحل

```typescript
// ✅ آمن — app_metadata يكتبها Service Role فقط
// لا يمكن للعميل تعديلها أبداً
const role = user.app_metadata?.role;
```

### في SQL

```sql
-- ❌ خطأ
SELECT auth.jwt() -> 'user_metadata' ->> 'role';

-- ✅ صحيح
SELECT auth.jwt() -> 'app_metadata' ->> 'role';

-- ✅ الدالة المعتمدة
CREATE FUNCTION get_my_role() RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'student'
  );
$$ LANGUAGE sql STABLE;
```

### كيفية تعيين الدور (admin فقط)

```typescript
// عبر Supabase Dashboard → Authentication → Users
// أو عبر Service Role API:
await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: { role: 'driver' },
});
```

---

## 3. Row Level Security (RLS)

### مبدأ Least Privilege

كل جدول لديه RLS مفعّل. المستخدم يرى فقط ما يخصه.

```sql
-- profiles: المستخدم يرى ملفه فقط
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin يرى الكل
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

-- subscriptions: الطالب يرى اشتراكاته فقط
CREATE POLICY "Students can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = student_id);

-- trips: السائق يرى رحلاته فقط
CREATE POLICY "Drivers can view own trips" ON trips
  FOR SELECT USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );
```

### حماية الحقول الحساسة

```sql
-- Trigger يمنع تغيير role أو is_verified إلا من admin
CREATE FUNCTION enforce_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only admins can change role';
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Only admins can change verification';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. التزامنية (Concurrency) — منع Race Conditions

### المشكلة

```
طالب A: يقرأ available_seats = 1
طالب B: يقرأ available_seats = 1
طالب A: يحجز → available_seats = 0
طالب B: يحجز → available_seats = -1 ← Overbooking!
```

### الحل: `FOR UPDATE NOWAIT`

```sql
-- في activate_license()
SELECT * INTO v_license
FROM licenses
WHERE code = upper(p_code) AND status = 'active'
FOR UPDATE NOWAIT;
-- NOWAIT: إذا كان الصف مقفلاً → يفشل فوراً (لا انتظار)
-- هذا يمنع deadlocks ويُخبر المستخدم فوراً
```

```sql
-- في cancel_subscription()
SELECT * INTO v_sub
FROM subscriptions
WHERE id = p_subscription_id
FOR UPDATE;
-- يقفل الصف حتى تنتهي العملية
```

### لماذا `NOWAIT` في التراخيص؟

إذا حاول طالبان تفعيل نفس الكود في نفس اللحظة:

- الطالب A يقفل الكود
- الطالب B يحاول القفل → `NOWAIT` يُفشل فوراً
- الطالب B يرى: "Invalid or already used license code"
- لا انتظار، لا deadlock

---

## 5. Rate Limiting

### لماذا DB-backed؟

```typescript
// ❌ خطأ — Deno يُعيد التشغيل (cold starts تمسح الذاكرة)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// ✅ صحيح — يبقى بين cold starts
await supabase.rpc('check_rate_limit', {
  p_user_id: user.id,
  p_action: 'trip_engine',
  p_limit: 30,
  p_window_seconds: 60,
});
```

### الحدود الحالية

| الـ Function  | الحد   | النافذة  |
| ------------- | ------ | -------- |
| `trip-engine` | 30 طلب | 60 ثانية |

### تنظيف تلقائي

```sql
-- pg_cron: كل ساعة يحذف السجلات القديمة
SELECT cron.schedule('cleanup-rate-limits', '0 * * * *',
  'SELECT cleanup_rate_limits()');
```

---

## 6. Idempotency

### المشكلة

```
السائق يضغط "بدء الرحلة"
الشبكة بطيئة → الطلب يُرسَل مرتين
الرحلة تتحدث مرتين → خطأ في state machine
```

### الحل

```typescript
// في التطبيق المحمول
const idempotencyKey = crypto.randomUUID();

await supabase.functions.invoke('trip-engine', {
  body: { tripId, newStatus, lat, lng },
  headers: { 'idempotency-key': idempotencyKey },
});
```

```typescript
// في trip-engine Edge Function
const idempotencyKey = req.headers.get('idempotency-key');

if (idempotencyKey) {
  const { data: existing } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('details->>idempotencyKey', idempotencyKey)
    .single();

  if (existing) {
    return { success: true, idempotent: true }; // لا تُنفّذ مرة ثانية
  }
}
```

---

## 7. CORS

### `trip-engine` و `send-notification`

```typescript
const ALLOWED_ORIGINS = [
  Deno.env.get('ADMIN_URL') || 'http://localhost:3000',
  'exp://localhost:8081',
  'http://localhost:8081',
];

function resolveOrigin(origin: string): string {
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}
// لا wildcard '*' — يرفض الطلبات من origins غير مصرح بها
```

---

## 8. Input Validation

### Zod Schemas في `packages/core`

```typescript
// كل input يمر عبر Zod قبل الوصول للـ DB
export const TripUpdateRequest = z.object({
  tripId: z.string().uuid(),
  newStatus: TripStatus,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// في التطبيق المحمول — GPS validation
if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
  logger.warn('[GPS] Invalid coordinates rejected', { lat, lng });
  return;
}
```

---

## 9. Audit Logging

كل عملية حساسة تُسجَّل في `audit_logs`:

```sql
-- يُستدعى من Edge Functions تلقائياً
SELECT log_audit(
  p_user_id    := user.id,
  p_action     := 'trip_status_change',
  p_resource   := 'trips',
  p_resource_id := tripId,
  p_details    := '{"newStatus": "in_transit", "idempotencyKey": "..."}'
);
```

---

## 10. قائمة التحقق الأمني

قبل أي تعديل، تأكد من:

- [ ] تستخدم `app_metadata.role` وليس `user_metadata.role`
- [ ] كل جدول جديد لديه RLS مفعّل وpolicies
- [ ] العمليات الحساسة تستخدم `FOR UPDATE` أو `FOR UPDATE NOWAIT`
- [ ] Edge Functions تتحقق من JWT قبل أي عملية
- [ ] لا `Map()` للـ rate limiting — استخدم `rate_limits` table
- [ ] CORS لا يستخدم `*` wildcard
- [ ] Input validation عبر Zod قبل الوصول للـ DB
- [ ] `SECURITY DEFINER` functions لا يمكن لـ `anon` استدعاؤها
- [ ] `search_path` مثبّت على `public` في كل function
