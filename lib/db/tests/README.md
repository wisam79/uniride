# نظام الاختبارات الشامل لـ UniRide

## نظرة عامة

تم تطوير نظام اختبارات متكامل يغطي **10 أنواع رئيسية** من الاختبارات لضمان جودة وأمان وموثوقية تطبيق UniRide.

## أنواع الاختبارات

### 1. اختبار الوحدات المنطقية (Logic Unit Tests)
- **الهدف**: التحقق من صحة المعادلات الحسابية والمنطقية
- **أمثلة**:
  - حساب تاريخ انتهاء الاشتراك (30 يوم)
  - حساب الرحلات المتبقية
  - التحقق من نطاقات الأسعار للخطط المختلفة

### 2. اختبار سلامة القيود (Constraint Validation Tests)
- **الهدف**: فرض قيود قاعدة البيانات ورفض البيانات غير الصالحة
- **أمثلة**:
  - رفض مستخدم بدون اسم
  - رفض رقم هاتف مكرر
  - رفض مقاعد سالبة
  - رفض خطط اشتراك غير معروفة

### 3. اختبار الأمان على مستوى الصفوف (RLS Security Tests)
- **الهدف**: عزل بيانات المستخدمين ومنع الوصول غير المصرح به
- **أمثلة**:
  - الطالب يرى اشتراكاته فقط
  - السائق يرى routes الخاصة به فقط
  - منع تعديل اشتراك طالب آخر

### 4. اختبار التزامن والسباق (Concurrency & Race Condition Tests)
- **الهدف**: منع الحجز الزائد عند طلبات متزامنة
- **التقنية**: استخدام `FOR UPDATE LOCK` في معاملات PostgreSQL
- **أمثلة**:
  - حجز المقعد الأخير من قبل طلاب متعددين في نفس الوقت
  - ضمان نجاح حجز واحد فقط

### 5. اختبار التماثل (Idempotency Tests)
- **الهدف**: منع تكرار العمليات الحساسة عند إعادة الطلب
- **التقنية**: استخدام `idempotency_key` فريد
- **أمثلة**:
  - منع إنشاء اشتراك مزدوج
  - منع خصم الدفع مرتين

### 6. اختبار التكامل مع الأحداث (Event Integration Tests)
- **الهدف**: التحقق من التأثيرات الجانبية عند تغيير البيانات
- **أمثلة**:
  - تحديث `totalStudents` عند إضافة اشتراك
  - زيادة `tripsUsed` عند إكمال رحلة

### 7. اختبار السيناريوهات الهامشية (Edge Case Tests)
- **الهدف**: فحص القيم القصوى والحالات الشاذة
- **أمثلة**:
  - اشتراك في آخر يوم من الشهر
  - رفض تاريخ انتهاء في الماضي
  - أسماء طويلة جداً (200 حرف)
  - أقصى عدد من الطلاب (100 مقعد)

### 8. اختبار المزامنة وحالة عدم الاتصال (Offline Sync Tests)
- **الهدف**: حل تعارضات البيانات عند عودة الاتصال
- **التقنية**: طابور عمليات محلي + استراتيجية Last Write Wins
- **أمثلة**:
  - تعديل نفس الاشتراك من جهازين
  - تخزين العمليات عند انقطاع الإنترنت

### 9. اختبار الأداء تحت الحمل (Performance Load Tests)
- **الهدف**: قياس زمن الاستجابة عند جلب كميات كبيرة من البيانات
- **المعايير**: جلب 1000 سجل في أقل من 100ms
- **التقنية**: Pagination + Indexing

### 10. اختبار سير العمل الكامل (End-to-End Workflow Tests)
- **الهدف**: محاكاة رحلة مستخدم كاملة من البداية للنهاية
- **أمثلة**:
  - تسجيل طالب → اشتراك → رحلة → إكمال
  - فصل الجنسين (أنثى مع أنثى فقط)

## تشغيل الاختبارات

```bash
# تثبيت الاعتماديات
pnpm install

# تشغيل جميع الاختبارات
pnpm test

# تشغيل الاختبارات في وضع المراقبة
pnpm test:watch

# تشغيل اختبار محدد
pnpm test -- -t "Concurrency"
```

## متطلبات البيئة

```bash
# متغير بيئة لقاعدة بيانات الاختبار
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/uniride_test"
```

## هيكل الملفات

```
lib/db/
├── src/
│   └── schema/
│       ├── users.ts
│       ├── routes.ts
│       ├── subscriptions.ts
│       └── trips.ts
├── tests/
│   └── comprehensive.test.ts    # ملف الاختبارات الشامل
├── vitest.config.ts              # إعدادات Vitest
└── package.json
```

## أفضل الممارسات المطبقة

| الممارسة | الوصف | التطبيق |
|----------|-------|---------|
| **Transactions** | معاملات ذرية | `db.transaction()` |
| **Row Locking** | قفل الصفوف | `SELECT FOR UPDATE` |
| **Idempotency** | منع التكرار | `idempotency_key` |
| **Pagination** | تقسيم البيانات | `LIMIT/OFFSET` |
| **Conflict Resolution** | حل التعارضات | Last Write Wins |
| **Type Safety** | أمان الأنواع | TypeScript + Zod |

## أمثلة على الكود

### معاملة ذرية مع قفل (Atomic Transaction with Lock)

```typescript
await db.transaction(async (tx) => {
  const currentRoute = await tx.select()
    .from(routesTable)
    .where(eq(routesTable.id, routeId))
    .for('update'); // قفل الصف
  
  if (currentRoute[0].availableSeats <= 0) {
    throw new Error('لا توجد مقاعد متاحة');
  }
  
  await tx.update(routesTable)
    .set({ availableSeats: currentRoute[0].availableSeats - 1 })
    .where(eq(routesTable.id, routeId));
});
```

### معالجة متماثلة للدفع (Idempotent Payment)

```typescript
const processPayment = (key: string, amount: number) => {
  if (paymentKeys.has(key)) {
    return { success: false, error: 'تم المعالجة مسبقاً' };
  }
  paymentKeys.add(key);
  return { success: true, amount };
};
```

## الخلاصة

يوفر هذا النظام تغطية شاملة لجميع الجوانب الحرجة:
- ✅ الأمان والعزل
- ✅ التزامن ومنع السباق
- ✅ التماثل ومنع التكرار
- ✅ الأداء تحت الحمل
- ✅ المزامنة دون اتصال
- ✅ سيناريوهات العالم الحقيقي
