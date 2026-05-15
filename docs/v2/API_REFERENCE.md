# 📡 مرجع API — UniRide v3

---

## Edge Functions

### 1. `trip-engine` (v6)

**الغرض:** تحديث حالة الرحلة للسائقين مع Rate Limiting وIdempotency.

**Endpoint:** `POST /functions/v1/trip-engine`

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
idempotency-key: <unique-uuid>   ← اختياري، يمنع التكرار
```

**Body:**

```json
{
  "tripId": "uuid",
  "newStatus": "driver_waiting | in_transit | completed | absent | cancelled",
  "lat": 33.3152,
  "lng": 44.3661
}
```

**الاستجابات:**

```json
// نجاح
{ "success": true }

// نجاح idempotent (طلب مكرر)
{ "success": true, "idempotent": true, "message": "Status already updated" }

// خطأ — غير مصادق
{ "error": "Missing authorization header" }   // 401

// خطأ — ليس سائقاً
{ "error": "Driver profile not found" }        // 403

// خطأ — Rate limit
{ "error": "Too many requests. Please try again later." }  // 429

// خطأ — انتقال غير صالح
{ "success": false, "error": "Invalid status transition" }  // 400
```

**Rate Limit:** 30 طلب / 60 ثانية لكل مستخدم

**CORS:** يقبل فقط من `ADMIN_URL`، `exp://localhost:8081`، `http://localhost:8081`

---

### 2. `send-notification` (v4)

**الغرض:** إرسال إشعار Push لمستخدم عبر Expo Push API — يدعم متعدد الأجهزة.

**Endpoint:** `POST /functions/v1/send-notification`

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Body:**

```json
{
  "targetUserId": "uuid",
  "title": "عنوان الإشعار",
  "body": "نص الإشعار",
  "data": { "key": "value" }   ← اختياري
}
```

**الاستجابات:**

```json
// نجاح — أُرسل لجميع الأجهزة
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "results": [...]
}

// المستخدم ليس لديه token
{ "success": false, "message": "User has no push token" }

// خطأ — ليس admin أو driver
{ "error": "Only admins and drivers can send notifications" }  // 403
```

**قيود الأدوار:**

- `admin` → يمكنه إرسال لأي مستخدم
- `driver` → يمكنه إرسال فقط للطلاب المشتركين في خطوطه
- `student` → ❌ ممنوع

**CORS:** نفس قيود `trip-engine`

---

### 3. `zaincash-checkout` (stub)

**الغرض:** بدء عملية دفع ZainCash.

**الحالة:** Stub — يحتاج `ZAINCASH_SECRET`, `ZAINCASH_MSISDN`, `ZAINCASH_MERCHANT_ID`

---

### 4. `zaincash-webhook` (stub)

**الغرض:** استقبال تأكيد الدفع من ZainCash.

**الحالة:** Stub — يحتاج تكاملاً كاملاً مع ZainCash API

---

## Database RPCs

### `activate_license(p_code TEXT)`

**الغرض:** تفعيل كود ترخيص وإنشاء subscription نشطة.

**الأدوار:** `student` فقط

**المنطق:**

1. `FOR UPDATE NOWAIT` على الكود — يمنع الاستخدام المزدوج
2. التحقق من عدم وجود subscription نشطة للخط
3. خصم مقعد من `routes.available_seats`
4. تحديث `licenses.status = 'used'`
5. إنشاء subscription جديدة

**الاستجابة:** `UUID` (subscription_id) أو exception

```sql
-- أمثلة على الـ exceptions
'Invalid or already used license code'
'You already have an active subscription for this route'
'No seats available for this route'
```

---

### `cancel_subscription(p_subscription_id UUID)`

**الغرض:** إلغاء اشتراك واسترداد المقعد بشكل ذري.

**الأدوار:** `student` فقط

**المنطق:**

1. `FOR UPDATE` على الاشتراك
2. التحقق من الملكية (`student_id = auth.uid()`)
3. التحقق من الحالة (`active` أو `pending` فقط)
4. تحديث `status = 'cancelled'`
5. إذا كان `active` → زيادة `routes.available_seats` بمقدار 1

```sql
-- أمثلة على الـ exceptions
'Subscription not found'
'You can only cancel your own subscriptions'
'Subscription is already expired and cannot be cancelled'
```

---

### `create_trip(p_route_id UUID, p_scheduled_at TIMESTAMPTZ)`

**الغرض:** إنشاء رحلة جديدة للسائق.

**الأدوار:** `driver` فقط

**التحقق:**

- السائق يملك الخط (`routes.driver_id = drivers.id`)
- يحل `drivers.id` من `auth.uid()` — لا يستخدم `auth.uid()` مباشرة

**الاستجابة:** `UUID` (trip_id)

---

### `update_trip_status(p_trip_id, p_new_status, p_lat, p_lng, p_driver_id)`

**الغرض:** تحديث حالة الرحلة مع التحقق من state machine.

**يُستدعى من:** `trip-engine` Edge Function فقط

**التحقق:**

- الانتقال صالح وفق state machine
- السائق يملك الرحلة

---

### `update_trip_location(p_trip_id UUID, p_lat NUMERIC, p_lng NUMERIC)`

**الغرض:** تحديث موقع GPS فقط — لا يغير حالة الرحلة.

**يُستدعى من:** `useLocationTracker` hook في التطبيق المحمول

---

### `get_dashboard_stats()`

**الغرض:** إحصائيات لوحة التحكم في استعلام واحد.

**الأدوار:** `admin` فقط

**الاستجابة:**

```json
{
  "total_users": 150,
  "total_drivers": 12,
  "total_routes": 8,
  "active_routes": 6,
  "total_trips": 340,
  "active_trips": 3,
  "total_subscriptions": 120,
  "active_subscriptions": 95,
  "monthly_revenue": 2850000
}
```

---

### `get_analytics_summary(p_start_date, p_end_date)`

**الغرض:** تحليلات مفصلة لفترة زمنية محددة.

**الأدوار:** `admin` فقط

**الاستجابة:**

```json
{
  "total_trips": 45,
  "completed_trips": 38,
  "cancelled_trips": 4,
  "total_revenue": 950000,
  "active_students": 87,
  "active_drivers": 10,
  "avg_rating": 4.3,
  "trips_by_status": {
    "completed": 38,
    "cancelled": 4,
    "absent": 3
  },
  "top_routes": [
    { "title": "خط الجامعة A", "subscriptions": 25, "price": 15000, "revenue": 375000 }
  ]
}
```

---

### `create_license_batch(p_route_id, p_batch_name, p_quantity, p_price, p_valid_days)`

**الغرض:** إنشاء دفعة من أكواد الترخيص.

**الأدوار:** `admin` فقط

**المنطق:** يولّد `p_quantity` كود عشوائي من 8 أحرف (A-Z, 0-9)

**الاستجابة:** `UUID` (batch_id)

---

### `submit_rating(p_trip_id UUID, p_rating INT, p_comment TEXT)`

**الغرض:** تقييم رحلة مكتملة.

**الأدوار:** `student` فقط

**التحقق:**

- الرحلة مكتملة (`status = 'completed'`)
- لم يُقيَّم مسبقاً (`UNIQUE(trip_id, student_id)`)
- التقييم بين 1 و 5

---

### `get_driver_avg_rating(p_driver_id UUID)`

**الغرض:** متوسط تقييم سائق.

**الاستجابة:** `NUMERIC(3,1)` أو `NULL`

---

### `ping()`

**الغرض:** فحص الاتصال بالشبكة — يعمل بدون session.

**الاستجابة:** `TRUE`

---

### `check_rate_limit(p_user_id, p_action, p_limit, p_window_seconds)`

**الغرض:** التحقق من Rate Limit — DB-backed.

**الاستجابة:** `BOOLEAN` (true = مسموح، false = تجاوز الحد)

---

### `log_audit(p_user_id, p_action, p_resource, p_resource_id, p_details)`

**الغرض:** تسجيل فعل في `audit_logs`.

**يُستدعى من:** Edge Functions تلقائياً

---

## Realtime Channels

### `trips-active-realtime`

```typescript
supabase
  .channel('trips-active-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
    fetchTrips(); // إعادة fetch كاملة — لا تدمج payload.new
  });
```

### `trip-{tripId}`

```typescript
supabase.channel(`trip-${tripId}`).on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'trips',
    filter: `id=eq.${tripId}`,
  },
  () => {
    fetchTrip(); // إعادة fetch مع joins
  },
);
```

### `routes-changes`

```typescript
supabase
  .channel('routes-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, () => {
    fetchRoutes();
  });
```

### `feature-flags-realtime`

```typescript
supabase
  .channel('feature-flags-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_flags' }, () => {
    fetchFlags(); // يُحدّث التطبيق فوراً بدون restart
  });
```

---

## متغيرات البيئة المطلوبة

### لوحة التحكم (Admin)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### التطبيق المحمول (Mobile)

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_TOKEN=
```

### Edge Functions (Supabase Secrets)

```
SUPABASE_URL=           ← تلقائي من Supabase
SUPABASE_SERVICE_ROLE_KEY= ← تلقائي من Supabase
ADMIN_URL=              ← رابط لوحة التحكم للإنتاج
ZAINCASH_SECRET=        ← مطلوب لتفعيل ZainCash
ZAINCASH_MSISDN=        ← رقم ZainCash
ZAINCASH_MERCHANT_ID=   ← معرف التاجر
```
