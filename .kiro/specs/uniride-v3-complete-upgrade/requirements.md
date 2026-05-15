# UniRide v3 — خطة الترقية الشاملة إلى 10/10

> **الهدف:** رفع تقييم المشروع من 6.8/10 إلى 10/10 عبر إصلاح جميع المشاكل المكتشفة وإضافة الميزات المفقودة.
> **المرجع:** مراجعة M6 الشاملة بتاريخ 2026-05-12

---

## المحور الأول: إصلاحات حرجة (يجب تنفيذها أولاً)

### REQ-001 — إصلاح تعارض أرقام Migrations

**المشكلة:** ملفان بنفس الرقم `2026051112` يسببان خطر نشر صامت.
**المتطلب:** إعادة تسمية `2026051112_feature_flags_and_analytics.sql` إلى `2026051113_feature_flags_and_analytics.sql` وتحديث AGENTS.md.
**معيار القبول:**

- [ ] لا يوجد ملفان بنفس الرقم في `supabase/migrations/`
- [ ] `supabase db push --dry-run` ينجح بدون أخطاء

---

### REQ-002 — إصلاح `<Authenticated>` wrapper في Dashboard

**المشكلة:** المستخدم غير المصادق يرى "Loading dashboard..." إلى الأبد بدلاً من redirect لصفحة تسجيل الدخول.
**المتطلب:** نقل `<Authenticated>` ليكون الـ wrapper الخارجي قبل أي حالة loading.
**معيار القبول:**

- [ ] المستخدم غير المصادق يُعاد توجيهه لـ `/login` فوراً
- [ ] حالة loading تظهر داخل `<Authenticated>` فقط

---

### REQ-003 — إصلاح CORS في send-notification

**المشكلة:** `Access-Control-Allow-Origin: *` يسمح لأي موقع باستدعاء الدالة.
**المتطلب:** تطبيق نفس نمط origin validation المستخدم في `trip-engine`.
**معيار القبول:**

- [ ] الدالة ترفض الطلبات من origins غير مصرح بها
- [ ] `ADMIN_URL` و Expo origins مسموح بها فقط

---

### REQ-004 — RPC `cancel_subscription()` آمن

**المشكلة:** إلغاء الاشتراك يتم مباشرة من العميل بدون استرداد المقعد.
**المتطلب:** إنشاء RPC `cancel_subscription(p_subscription_id UUID)` يقوم بـ:

1. التحقق من أن الاشتراك ينتمي للطالب الحالي
2. تحديث `status = 'cancelled'`
3. زيادة `routes.available_seats` بمقدار 1
4. كل ذلك في transaction واحدة
   **معيار القبول:**

- [ ] RPC موجود في migration جديد `2026051114_cancel_subscription.sql`
- [ ] `apps/mobile/app/subscriptions.tsx` يستخدم RPC بدلاً من direct update
- [ ] المقعد يُستعاد عند الإلغاء

---

### REQ-005 — إصلاح عرض السائق في صفحة Routes

**المشكلة:** عمود "Driver" يعرض `licenseNumber` بدلاً من اسم السائق.
**المتطلب:** تعديل `apps/admin/src/app/routes/page.tsx` لجلب اسم السائق من `profiles` عبر join أو useMany على profiles.
**معيار القبول:**

- [ ] عمود Driver يعرض `full_name` من profiles
- [ ] لا يعرض UUID خام

---

## المحور الثاني: صفحات لوحة التحكم المفقودة

### REQ-006 — صفحة إدارة الرحلات `/trips`

**المشكلة:** لا توجد صفحة لعرض وإدارة الرحلات في لوحة التحكم.
**المتطلب:** إنشاء `apps/admin/src/app/trips/page.tsx` تعرض:

- جدول بجميع الرحلات مع: ID، الخط، السائق، الحالة، وقت الجدولة
- فلتر على الحالة (scheduled, driver_waiting, in_transit, completed, cancelled)
- زر "إلغاء" للرحلات النشطة (scheduled, driver_waiting, in_transit)
- Realtime updates كل 30 ثانية
- Chip ملون لكل حالة
  **معيار القبول:**
- [ ] الصفحة تعرض الرحلات مع pagination
- [ ] الفلتر يعمل
- [ ] الإلغاء يستدعي `update_trip_status` RPC
- [ ] الصفحة مسجلة في `AppProvider.tsx` resources

---

### REQ-007 — صفحة إدارة الاشتراكات `/subscriptions`

**المشكلة:** لا توجد صفحة لعرض الاشتراكات في لوحة التحكم.
**المتطلب:** إنشاء `apps/admin/src/app/subscriptions/page.tsx` تعرض:

- جدول بجميع الاشتراكات مع: الطالب، الخط، الحالة، تاريخ البداية والنهاية
- فلتر على الحالة (active, expired, cancelled, pending)
- عرض اسم الطالب من profiles (لا UUID)
- عرض اسم الخط من routes (لا UUID)
  **معيار القبول:**
- [ ] الصفحة تعرض الاشتراكات مع pagination
- [ ] أسماء الطلاب والخطوط تظهر بدلاً من UUIDs
- [ ] الصفحة مسجلة في `AppProvider.tsx` resources

---

### REQ-008 — صفحة إدارة Feature Flags `/feature-flags`

**المشكلة:** لا توجد واجهة لتفعيل/تعطيل الـ flags — يحتاج المدير لـ SQL مباشر.
**المتطلب:** إنشاء `apps/admin/src/app/feature-flags/page.tsx` تعرض:

- قائمة بجميع الـ flags مع اسم، وصف، وحالة (enabled/disabled)
- Switch لكل flag يحدّث DB مباشرة
- Realtime: التغييرات تنعكس فوراً على التطبيق المحمول
  **معيار القبول:**
- [ ] الصفحة تعرض جميع الـ flags
- [ ] Toggle يعمل ويحدّث `feature_flags` table
- [ ] الصفحة مسجلة في navigation وAppProvider

---

### REQ-009 — Realtime في Dashboard

**المشكلة:** أرقام Dashboard تتجمد بعد التحميل الأول.
**المتطلب:** إضافة auto-refresh كل 30 ثانية + زر "تحديث يدوي" في `apps/admin/src/app/page.tsx`.
**معيار القبول:**

- [ ] الأرقام تتحدث تلقائياً كل 30 ثانية
- [ ] زر refresh يدوي موجود
- [ ] لا memory leaks (cleanup في useEffect)

---

### REQ-010 — Date Range Picker في Analytics

**المشكلة:** Analytics دائماً آخر 30 يوم، لا يمكن مقارنة فترات.
**المتطلب:** إضافة date range picker في `apps/admin/src/app/analytics/page.tsx` يمرر `p_start_date` و `p_end_date` للـ RPC.
**معيار القبول:**

- [ ] Date picker يعمل ويغير البيانات
- [ ] الـ RPC يُستدعى بالتواريخ المختارة
- [ ] قيم افتراضية: آخر 30 يوم

---

### REQ-011 — فلتر وبحث في صفحة Licenses

**المشكلة:** صفحة Licenses بدون فلتر — غير قابلة للاستخدام مع آلاف الأكواد.
**المتطلب:** إضافة فلاتر في `apps/admin/src/app/licenses/page.tsx`:

- فلتر على `status` (active, used, revoked)
- فلتر على `batch_id` (dropdown من license_batches)
- بحث بالكود
  **معيار القبول:**
- [ ] الفلاتر تعمل وتُحدّث الجدول
- [ ] البحث بالكود يعمل

---

### REQ-012 — عرض اسم المؤسسة في Profile Show

**المشكلة:** `institution_id` يعرض UUID خام بدلاً من اسم المؤسسة.
**المتطلب:** تعديل `apps/admin/src/app/profiles/show/[id]/page.tsx` لاستخدام `useOne` لجلب اسم المؤسسة.
**معيار القبول:**

- [ ] اسم المؤسسة يظهر بدلاً من UUID
- [ ] يعرض "N/A" إذا لم تكن هناك مؤسسة

---

### REQ-013 — إضافة Feature Flags لـ Navigation

**المتطلب:** إضافة `/feature-flags` لـ `NAV_ITEMS` في `apps/admin/src/components/layout.tsx` مع أيقونة مناسبة.
**معيار القبول:**

- [ ] الرابط يظهر في القائمة الجانبية
- [ ] الصفحة تفتح بشكل صحيح

---

## المحور الثالث: إصلاحات التطبيق المحمول

### REQ-014 — فلترة `useActiveTrips` بالمؤسسة

**المشكلة:** طلاب يرون رحلات جامعات أخرى.
**المتطلب:** تعديل `useActiveTrips` في `apps/mobile/src/hooks/useTrips.ts` لفلترة الرحلات بناءً على `institution_id` من profile الطالب.
**الحل:** join مع routes ثم فلتر على `routes.institution_id`.
**معيار القبول:**

- [ ] الطالب يرى فقط رحلات مؤسسته
- [ ] إذا لم يكن للطالب مؤسسة، يرى جميع الرحلات

---

### REQ-015 — استبدال `console.warn` بـ `logger` في useTrips

**المشكلة:** أخطاء GPS وRealtime لا تُرسَل لـ log-error Edge Function.
**المتطلب:** استبدال جميع `console.warn` في `useTrips.ts` بـ `logger.warn` / `logger.error`.
**معيار القبول:**

- [ ] لا يوجد `console.warn` في `useTrips.ts`
- [ ] جميع الأخطاء تمر عبر `logger`

---

### REQ-016 — مسح `cachedFlags` عند تسجيل الخروج

**المشكلة:** feature flags تبقى محفوظة بعد logout.
**المتطلب:** تعديل `useFeatureFlags.ts` لمسح `cachedFlags` عند logout، وربطه بـ `useAuthStore` logout event.
**معيار القبول:**

- [ ] `cachedFlags = null` يُستدعى عند logout
- [ ] المستخدم الجديد يحصل على flags محدّثة

---

### REQ-017 — التحقق من صحة الإحداثيات في GPS Queue

**المشكلة:** إحداثيات خاطئة تُخزَّن وتُرسَل.
**المتطلب:** إضافة validation في `queueLocationUpdate` و `watchPositionAsync` callback:

- `lat` بين -90 و 90
- `lng` بين -180 و 180
  **معيار القبول:**
- [ ] إحداثيات خارج النطاق تُرفض ولا تُضاف للـ queue
- [ ] `logger.warn` يُستدعى عند رفض الإحداثيات

---

## المحور الرابع: إصلاحات Edge Functions

### REQ-018 — دعم متعدد الأجهزة في send-notification

**المشكلة:** الإشعار يُرسَل لجهاز واحد فقط (`pushTokens[0]`).
**المتطلب:** تعديل `send-notification/index.ts` لإرسال الإشعار لجميع tokens المستخدم.
**معيار القبول:**

- [ ] الإشعار يُرسَل لجميع tokens
- [ ] النتائج تُجمَّع وتُعاد في response
- [ ] فشل token واحد لا يوقف الباقين

---

## المحور الخامس: قاعدة البيانات

### REQ-019 — Migration `cancel_subscription` RPC

**المتطلب:** إنشاء `supabase/migrations/2026051114_cancel_subscription.sql` يحتوي على:

```sql
CREATE OR REPLACE FUNCTION cancel_subscription(p_subscription_id UUID)
RETURNS void AS $$
-- التحقق من الملكية + تحديث الحالة + استرداد المقعد في transaction
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**معيار القبول:**

- [ ] الدالة تتحقق من أن `student_id = auth.uid()`
- [ ] تُحدّث `status = 'cancelled'`
- [ ] تزيد `available_seats` بمقدار 1
- [ ] ترفع exception إذا كان الاشتراك غير نشط

---

### REQ-020 — تحديث AGENTS.md

**المتطلب:** تحديث `AGENTS.md` ليعكس:

- رقم migration الجديد `2026051114`
- إضافة `cancel_subscription()` لقائمة RPCs
- تحديث قائمة الملفات الجديدة
  **معيار القبول:**
- [ ] AGENTS.md محدّث ودقيق

---

## ملخص المهام حسب الأولوية

### 🔴 أولوية قصوى (يجب قبل أي شيء)

| #       | المهمة                       | الملف                                  | الحالة   |
| ------- | ---------------------------- | -------------------------------------- | -------- |
| REQ-001 | إصلاح تعارض Migration        | rename file                            | ✅ مكتمل |
| REQ-002 | إصلاح Authenticated wrapper  | `admin/app/page.tsx`                   | ✅ مكتمل |
| REQ-003 | إصلاح CORS send-notification | `functions/send-notification/index.ts` | ✅ مكتمل |
| REQ-004 | RPC cancel_subscription      | migration + `subscriptions.tsx`        | ✅ مكتمل |

### 🟠 أولوية عالية (لوحة التحكم المفقودة)

| #       | المهمة             | الملف                              | الحالة   |
| ------- | ------------------ | ---------------------------------- | -------- |
| REQ-006 | صفحة Trips         | `admin/app/trips/page.tsx`         | ✅ مكتمل |
| REQ-007 | صفحة Subscriptions | `admin/app/subscriptions/page.tsx` | ✅ مكتمل |
| REQ-008 | صفحة Feature Flags | `admin/app/feature-flags/page.tsx` | ✅ مكتمل |
| REQ-013 | Navigation update  | `admin/components/layout.tsx`      | ✅ مكتمل |

### 🟡 أولوية متوسطة (تحسينات)

| #       | المهمة                      | الملف                                   | الحالة   |
| ------- | --------------------------- | --------------------------------------- | -------- |
| REQ-005 | إصلاح عرض Driver في Routes  | `admin/app/routes/page.tsx`             | ✅ مكتمل |
| REQ-009 | Realtime Dashboard          | `admin/app/page.tsx`                    | ✅ مكتمل |
| REQ-010 | Date Range Analytics        | `admin/app/analytics/page.tsx`          | ✅ مكتمل |
| REQ-011 | فلتر Licenses               | `admin/app/licenses/page.tsx`           | ✅ مكتمل |
| REQ-012 | Institution name في Profile | `admin/app/profiles/show/[id]/page.tsx` | ✅ مكتمل |
| REQ-014 | فلترة useActiveTrips        | `mobile/hooks/useTrips.ts`              | ✅ مكتمل |
| REQ-015 | logger في useTrips          | `mobile/hooks/useTrips.ts`              | ✅ مكتمل |
| REQ-016 | مسح cachedFlags             | `mobile/hooks/useFeatureFlags.ts`       | ✅ مكتمل |
| REQ-017 | GPS validation              | `mobile/hooks/useTrips.ts`              | ✅ مكتمل |
| REQ-018 | Multi-device notifications  | `functions/send-notification/index.ts`  | ✅ مكتمل |

### 🔵 أولوية منخفضة (توثيق)

| #       | المهمة                        | الملف                  | الحالة   |
| ------- | ----------------------------- | ---------------------- | -------- |
| REQ-019 | Migration cancel_subscription | `supabase/migrations/` | ✅ مكتمل |
| REQ-020 | تحديث AGENTS.md               | `AGENTS.md`            | ✅ مكتمل |

---

## التقييم المتوقع بعد التنفيذ

| المجال          | قبل        | بعد        |
| --------------- | ---------- | ---------- |
| الأمان          | 8/10       | 10/10      |
| لوحة التحكم     | 5/10       | 10/10      |
| التطبيق المحمول | 7/10       | 9/10       |
| قاعدة البيانات  | 8/10       | 10/10      |
| الأداء          | 7/10       | 9/10       |
| الاكتمال        | 6/10       | 10/10      |
| **المجموع**     | **6.8/10** | **9.7/10** |

---

> **آخر تحديث:** 2026-05-12
> **المرحلة:** M7 — Complete Upgrade
> **عدد المتطلبات:** 20 متطلب
