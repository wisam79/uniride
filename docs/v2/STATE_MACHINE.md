# 🔄 State Machine — UniRide v3

---

## 1. دورة حياة الرحلة (Trip Lifecycle)

```
                    ┌─────────────┐
                    │  scheduled  │ ← السائق ينشئ الرحلة
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
    ┌──────────────────┐       ┌─────────────┐
    │  driver_waiting  │       │  cancelled  │
    │ السائق في الموقع │       │   ملغاة     │
    └────────┬─────────┘       └─────────────┘
             │
    ┌────────┼────────┐
    ▼                  ▼
┌────────────┐  ┌─────────────┐
│ in_transit │  │  cancelled  │
│ في الطريق  │  │   ملغاة     │
└─────┬──────┘  └─────────────┘
      │
┌─────┴──────┐
│            │
▼            ▼
┌──────────┐ ┌────────┐
│completed │ │ absent │
│ مكتملة   │ │ غائب   │
└──────────┘ └────────┘
```

### الانتقالات المسموحة

| من               | إلى              | الشرط                |
| ---------------- | ---------------- | -------------------- |
| `scheduled`      | `driver_waiting` | السائق وصل للموقع    |
| `scheduled`      | `cancelled`      | إلغاء قبل البدء      |
| `driver_waiting` | `in_transit`     | انطلاق الرحلة        |
| `driver_waiting` | `cancelled`      | إلغاء أثناء الانتظار |
| `in_transit`     | `completed`      | وصول للوجهة          |
| `in_transit`     | `absent`         | الطالب لم يركب       |
| `completed`      | —                | نهاية (لا انتقالات)  |
| `absent`         | —                | نهاية (لا انتقالات)  |
| `cancelled`      | —                | نهاية (لا انتقالات)  |

### التحقق في TypeScript

```typescript
// packages/core/index.ts
export const ValidTransitions: Record<TripStatus, TripStatus[]> = {
  scheduled: ['driver_waiting', 'cancelled'],
  driver_waiting: ['in_transit', 'cancelled'],
  in_transit: ['completed', 'absent'],
  completed: [],
  absent: [],
  cancelled: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return ValidTransitions[from]?.includes(to) ?? false;
}

// الاستخدام في التطبيق المحمول
if (!canTransition(currentStatus, newStatus)) {
  Alert.alert('خطأ', 'انتقال حالة غير صالح');
  return;
}
```

### التحقق في PostgreSQL

```sql
-- update_trip_status() تتحقق من الانتقال قبل التنفيذ
CREATE OR REPLACE FUNCTION update_trip_status(
  p_trip_id UUID,
  p_new_status TEXT,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_driver_id UUID
) RETURNS void AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status FROM trips WHERE id = p_trip_id;

  -- التحقق من صحة الانتقال
  IF NOT validate_trip_transition(p_trip_id, p_new_status) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %',
      v_current_status, p_new_status;
  END IF;

  UPDATE trips
  SET status = p_new_status,
      last_lat = p_lat,
      last_lng = p_lng,
      started_at = CASE WHEN p_new_status = 'in_transit' THEN NOW() ELSE started_at END,
      ended_at   = CASE WHEN p_new_status IN ('completed', 'absent', 'cancelled') THEN NOW() ELSE ended_at END
  WHERE id = p_trip_id AND driver_id = p_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. دورة حياة الاشتراك (Subscription Lifecycle)

```
                ┌─────────┐
                │ pending │ ← بعد activate_license() مباشرة
                └────┬────┘
                     │
          ┌──────────┼──────────┐
          ▼                     ▼
      ┌────────┐         ┌───────────┐
      │ active │         │ cancelled │
      │  نشط   │         │   ملغي    │
      └────┬───┘         └───────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌─────────┐ ┌───────────┐
│ expired │ │ cancelled │
│ منتهي   │ │   ملغي    │
└─────────┘ └───────────┘
```

### تفاصيل الانتقالات

| الانتقال                | المُحرّك                | التأثير           |
| ----------------------- | ----------------------- | ----------------- |
| `pending` → `active`    | `activate_license()`    | يخصم مقعد من الخط |
| `active` → `cancelled`  | `cancel_subscription()` | يُعيد المقعد للخط |
| `pending` → `cancelled` | `cancel_subscription()` | لا يُعيد مقعداً   |
| `active` → `expired`    | pg_cron (كل ساعة)       | لا يُعيد مقعداً   |

### تدفق تفعيل الترخيص

```
Student يدخل الكود (8 أحرف)
        │
        ▼
activate_license(p_code)
        │
        ├── FOR UPDATE NOWAIT على الكود
        │   (يمنع استخدامه مرتين في نفس الوقت)
        │
        ├── التحقق: هل للطالب اشتراك نشط لهذا الخط؟
        │   إذا نعم → RAISE EXCEPTION
        │
        ├── خصم مقعد من routes.available_seats
        │   إذا لا مقاعد → RAISE EXCEPTION
        │
        ├── تحديث licenses.status = 'used'
        │
        └── INSERT INTO subscriptions (status = 'active')
                │
                ▼
            subscription_id (UUID)
```

---

## 3. دورة حياة الترخيص (License Lifecycle)

```
┌────────┐     activate_license()     ┌──────┐
│ active │ ──────────────────────────► │ used │
└────────┘                             └──────┘
    │
    │  admin revoke
    ▼
┌─────────┐
│ revoked │
└─────────┘
```

---

## 4. تدفق GPS والتتبع

```
السائق يبدأ الرحلة (in_transit)
        │
        ▼
useLocationTracker.startTracking(tripId)
        │
        ▼
watchPositionAsync (كل 5 ثوانٍ أو 10 متر)
        │
        ├── [متصل] ──► update_trip_location(tripId, lat, lng)
        │                      │
        │                      ▼
        │              trips.last_lat/last_lng تُحدَّث
        │                      │
        │                      ▼
        │              Realtime → الطلاب يرون الموقع
        │
        └── [غير متصل] ──► queueLocationUpdate(tripId, lat, lng)
                                   │
                                   ▼
                           AsyncStorage (gps_offline_queue)
                                   │
                           بعد 5 ثوانٍ من عودة الاتصال
                                   │
                                   ▼
                           flushGpsQueue() (max 3 retries)
```

### التحقق من الإحداثيات

```typescript
// قبل الإضافة للـ queue أو الإرسال
if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
  logger.warn('[GPS] Invalid coordinates rejected', { lat, lng });
  return; // لا تُضاف للـ queue
}
```

---

## 5. Feature Flags — دورة الحياة

```
Admin يفتح /feature-flags
        │
        ▼
يضغط Toggle على flag
        │
        ▼
UPDATE feature_flags SET enabled = !enabled
        │
        ▼
Realtime channel 'feature-flags-realtime'
        │
        ▼
useFeatureFlags() في التطبيق المحمول يُعيد fetch
        │
        ▼
الميزة تُفعَّل/تُعطَّل فوراً بدون restart
```

### الـ Flags الحالية

| الاسم                | الحالة      | الوصف                              |
| -------------------- | ----------- | ---------------------------------- |
| `realtime_tracking`  | ✅ enabled  | تتبع GPS حي                        |
| `push_notifications` | ✅ enabled  | إشعارات Expo Push                  |
| `offline_mode`       | ✅ enabled  | cache الاشتراكات offline           |
| `ratings_system`     | ✅ enabled  | تقييم الرحلات                      |
| `zaincash_payment`   | ❌ disabled | بوابة ZainCash (يحتاج credentials) |
