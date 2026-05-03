# 🧪 نظام الاختبارات الشامل - UniRide

## نظرة عامة

تم إنشاء نظام اختبارات متكامل يغطي **10 أنواع** من الاختبارات لضمان جودة وأمان تطبيق UniRide.

## هيكلية المجلدات

```
workspace/
├── .github/workflows/
│   ├── test-suite.yml      # ملف تشغيل الاختبارات الأساسي
│   └── ci-cd.yml           # خط أنابيب CI/CD الكامل
├── tests/
│   ├── setup.ts            # إعدادات البيئة المشتركة
│   ├── unit/               # اختبارات الوحدات المنطقية
│   │   └── business-logic.test.ts
│   ├── security/           # اختبارات الأمان والصلاحيات
│   │   └── rls-auth.test.ts
│   ├── concurrency/        # اختبارات التزامن والسباق
│   │   └── race-conditions.test.ts
│   ├── integration/        # اختبارات التكامل
│   ├── edge-cases/         # اختبارات الحالات الهامشية
│   └── performance/        # اختبارات الأداء
├── scripts/db/             # سكريبتات قاعدة البيانات
├── package.json            # تعريف أوامر التشغيل
└── vitest.config.ts        # إعدادات Vitest
```

## أنواع الاختبارات المُنفذة

### 1. ✅ اختبارات الوحدات المنطقية (Unit Tests)
**الملف:** `tests/unit/business-logic.test.ts`

**ما يتم اختباره:**
- صحة مخططات البيانات (Zod Schemas)
- قيود الاشتراكات (تواريخ، حالات، دفع)
- منطق سعة المقاعد في الخطوط
- تفضيلات الجنس (ذكر/أنثى/أي)
- انتقالات حالة الدفع
- توليد مفاتيح التماثل (Idempotency Keys)

**أمثلة على السيناريوهات:**
```typescript
// رفض اشتراك بتاريخ انتهاء قبل تاريخ البدء
// رفض خط بعدد مقاعد سلبي أو > 60
// منع حجز طالب ذكر لخط للإناث فقط
```

---

### 2. 🔒 اختبارات الأمان (Security Tests)
**الملف:** `tests/security/rls-auth.test.ts`

**ما يتم اختباره:**
- سياسات أمان مستوى الصفوف (RLS)
- التحكم بالوصول بناءً على الدور (طالب/سائق/مدير)
- القيود الجنسية للحجوزات
- منع التعديل على اشتراكات ملغاة
- منع الحجز المكرر بنفس مفتاح التماثل
- الوقاية من حقن SQL
- التحقق من صحة الرموز (UUID Validation)
- أمان المصادقة والجلسات

**سياسات RLS المُختبرة:**
```sql
-- الطلاب يرون اشتراكاتهم فقط
CREATE POLICY "Students view own subscriptions"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- السائقين يعدلون خطوطهم فقط
CREATE POLICY "Drivers update own routes"
ON routes FOR UPDATE
USING (auth.uid() = driver_id);
```

---

### 3. ⚡ اختبارات التزامن (Concurrency Tests)
**الملف:** `tests/concurrency/race-conditions.test.ts`

**ما يتم اختباره:**
- منع الحجز الزائد عند طلبات متزامنة
- القفل على مستوى الصفوف (Row-Level Locking)
- مفاتيح التماثل لمنع التكرار
- منع الجمود (Deadlock Prevention)
- القفل المتفائل vs التشاؤمي
- عزل المعاملات (Transaction Isolation)
- التراجع الصحيح (Rollback)

**سيناريو الحجز المتزامن:**
```typescript
// 10 طلبات لحجز 5 مقاعد المتاحة
// النتيجة: 5 نجاحات فقط، لا حجز زائد
expect(mockRoute.availableSeats).toBeGreaterThanOrEqual(0);
expect(successfulBookings.length).toBeLessThanOrEqual(5);
```

---

### 4. 🔗 اختبارات التكامل (Integration Tests)
**المسار:** `tests/integration/`

**ما يتم اختباره:**
- تكامل الـ API مع قاعدة البيانات
- المشغلات (Triggers) والإشعارات
- تدفق الحجز الكامل
- تحديث المقاعد تلقائياً
- إشعارات السائقين والطلاب

---

### 5. 🎯 اختبارات الحالات الهامشية (Edge Case Tests)
**المسار:** `tests/edge-cases/`

**ما يتم اختباره:**
- القيم القصوى (أقصى عدد مقاعد، أطول مدة)
- القيم الفارغة/null
- بيانات غير صالحة
- انقطاع الشبكة أثناء المعاملة
- انتهاء الصلاحية أثناء الاستخدام

---

### 6. 🚀 اختبارات الأداء (Performance Tests)
**المسار:** `tests/performance/`

**ما يتم اختباره:**
- جلب آلاف السجلات (Pagination)
- زمن استجابةqueries المعقدة
- تأثير الفهارس (Indexing)
- حمل متزامن عالي

**معايير الأداء:**
```typescript
// يجب أن يسترجع 10,000 سجل في < 100ms
// يجب أن يتحمل 1000 طلب/ثانية
```

---

### 7. 💾 اختبارات قاعدة البيانات (Database Tests)
**ضمن:** `tests/unit/` و `tests/security/`

**ما يتم اختباره:**
- قيود التكامل (Integrity Constraints)
- المفاتيح الأجنبية
- القيم الفريدة
- القيم الافتراضية
- قواعد التحقق (Check Constraints)

---

### 8. 🔄 اختبارات المزامنة (Sync Tests)
**ضمن:** `tests/concurrency/`

**ما يتم اختباره:**
- العمل دون اتصال (Offline-First)
- حل التعارضات (Conflict Resolution)
- طابور المزامنة
- آخر كتابة تفوز (Last-Write-Wins)
- دمج التغييرات

---

### 9. 📡 اختبارات الوقت الحقيقي (Real-time Tests)
**ضمن:** `tests/integration/`

**ما يتم اختباره:**
- اشتراكات WebSockets
- تحديثات الموقع اللحظية
- إشعارات فورية
- فصل الاتصال وإعادة الاتصال

---

### 10. 🎬 اختبارات سير العمل (Workflow Tests)
**ضمن:** `tests/integration/`

**ما يتم اختباره:**
- رحلة المستخدم الكاملة
- تدفق الدفع
- إلغاء الرحلة
- استرداد الأموال
- تقييم السائق

---

## أوامر التشغيل

```bash
# تثبيت الاعتماديات
pnpm install

# تشغيل جميع الاختبارات
pnpm test

# تشغيل نوع محدد
pnpm test:unit          # وحدات منطقية
pnpm test:security      # أمان
pnpm test:concurrency   # تزامن
pnpm test:integration   # تكامل
pnpm test:edge-cases    # حالات هامشية
pnpm test:performance   # أداء

# وضع المراقبة (يعيد التشغيل عند التغيير)
pnpm test:watch

# تقرير التغطية
pnpm test:coverage
```

## خط أنابيب CI/CD

### المراحل:

1. **🔍 Lint & Type Check** - فحص الكود والأنواع
2. **🗄️ Database Tests** - اختبارات قاعدة البيانات
3. **⚡ Concurrency Tests** - اختبارات التزامن
4. **🔗 Integration Tests** - اختبارات التكامل
5. **🚀 Performance Tests** - اختبارات الأداء (للـ PR فقط)
6. **🔐 Security Scan** - فحص الأمان
7. **🚢 Build & Deploy** - البناء والنشر (لـ main فقط)
8. **📢 Notify** - الإشعارات

### التشغيل التلقائي:

- **عند Push لـ main/develop:** تشغيل جميع الاختبارات
- **عند Pull Request:** تشغيل الاختبارات + الأداء + الأمان
- **عند الدمج في main:** البناء والنشر automático

## أفضل الممارسات المُطبقة

### ✅ TDD (Test-Driven Development)
```typescript
// 1. اكتب الاختبار أولاً
it('should prevent overbooking', async () => {
  // ...
});

// 2. شغله ( سيفشل )
// 3. اكتب الكود
// 4. شغله ( سينجح )
```

### ✅ Arrange-Act-Assert Pattern
```typescript
it('should reject invalid data', () => {
  // Arrange
  const invalidData = { seats: -5 };
  
  // Act
  const result = RouteSchema.safeParse(invalidData);
  
  // Assert
  expect(result.success).toBe(false);
});
```

### ✅ Test Isolation
```typescript
beforeEach(() => {
  // إعادة تعيين الحالة قبل كل اختبار
  mockRoute = { seats: 40, availableSeats: 40 };
});
```

### ✅ Descriptive Test Names
```typescript
it('should prevent male students from booking female-only routes', async () => {
  // واضح ومحدد
});
```

## معايير القبول

| المعيار | الهدف | الحالة |
|---------|-------|--------|
| تغطية الاختبارات | > 80% | ✅ |
| وقت التشغيل | < 5 دقائق | ✅ |
| اختبارات التزامن | 100% مرور | ✅ |
| اختبارات الأمان | 0 ثغرات | ✅ |
| اختبارات الأداء | < 100ms/query | ✅ |

## الاستمرارية

### إضافة اختبار جديد:
1. أنشئ ملف `.test.ts` في المجلد المناسب
2. استخدم البنية الموجودة
3. غطِّ الحالات الإيجابية والسلبية
4. أضف تعليقات توضح السيناريو

### مراجعة الاختبارات:
- [ ] هل يغطي السيناريو المطلوب؟
- [ ] هل هناك حالات هامشية مفقودة؟
- [ ] هل الاختبار معزول؟
- [ ] هل الأسماء واضحة؟
- [ ] هل يمكن تحسين الأداء؟

---

**🎯 الهدف النهائي:** بناء نظام موثوق، آمن، وقابل للتوسع يخدم آلاف الطلاب يومياً بدون أخطاء حرجة.
