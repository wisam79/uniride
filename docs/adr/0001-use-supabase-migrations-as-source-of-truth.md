# ADR-0001: Use Supabase Migrations as the Single Source of Truth for the Database

**Date:** 2026-05-12
**Status:** Accepted

---

## Context

مشروع UniRide يحتاج إلى آلية موحّدة لإدارة مخطط قاعدة البيانات (schema) عبر بيئات التطوير والإنتاج. في مرحلة مبكرة من المشروع، كان يُستخدم **Drizzle ORM** (`packages/db`) لتعريف الـ schema بـ TypeScript وتوليد migrations منه.

ظهرت عدة مشاكل مع هذا النهج:

1. **ازدواجية مصدر الحقيقة:** الـ schema مُعرَّف في Drizzle TypeScript _وأيضاً_ في ملفات SQL الخاصة بـ Supabase، مما أدى إلى تعارضات وتناقضات.
2. **تعقيد غير ضروري:** Drizzle يُضيف طبقة تجريد فوق Supabase الذي يوفر بالفعل نظام migrations متكاملاً.
3. **ميزات Supabase غير مدعومة:** ميزات مثل Row Level Security (RLS)، PostgreSQL functions، triggers، وextensions تُكتب مباشرةً بـ SQL ولا تُعبَّر عنها بشكل طبيعي في Drizzle.
4. **تكلفة الصيانة:** الحفاظ على تزامن Drizzle schema مع Supabase migrations يتطلب جهداً مستمراً دون قيمة مضافة واضحة.
5. **Edge Functions بـ Deno:** Edge Functions تتفاعل مع قاعدة البيانات عبر Supabase client مباشرةً، وليس عبر Drizzle.

---

## Decision

**سنحذف `packages/db` (Drizzle) بالكامل ونعتمد Supabase Migrations كمصدر الحقيقة الوحيد لقاعدة البيانات.**

كل تغيير في الـ schema يجب أن يتم عبر ملف SQL جديد في `supabase/migrations/` يتبع نمط التسمية:

```
YYYYMMDDNN_description.sql

مثال: 2026051110_m5_performance.sql
```

يُرفع الـ migration للإنتاج عبر:

```bash
supabase db push
```

---

## Consequences

### إيجابيات

- **مصدر حقيقة واحد:** كل الـ schema في `supabase/migrations/` — لا تعارض ولا ازدواجية.
- **دعم كامل لـ PostgreSQL:** RLS policies، functions، triggers، extensions — كلها مكتوبة بـ SQL الأصلي بدون قيود ORM.
- **بساطة:** حذف `packages/db` يُقلل تعقيد الـ monorepo وعدد التبعيات.
- **توافق مع Edge Functions:** Deno Edge Functions تستخدم Supabase client مباشرةً — لا حاجة لـ Drizzle.
- **CI/CD مباشر:** `supabase db push` في `deploy.yml` يُطبّق الـ migrations تلقائياً.
- **Dry-run آمن:** `supabase db push --dry-run` يتيح التحقق قبل التطبيق.

### سلبيات / مقايضات

- **لا type safety تلقائية للـ schema:** يجب كتابة TypeScript types يدوياً أو توليدها من Supabase CLI (`supabase gen types`).
- **لا query builder:** الاستعلامات تُكتب عبر Supabase JS client أو SQL مباشر — لا Drizzle query builder.
- **مسؤولية المطوّر:** كتابة SQL صحيح ومتوافق مع PostgreSQL تتطلب معرفة أعمق من ORM.

---

## Alternatives Considered

### البديل 1: الإبقاء على Drizzle مع Supabase

الاستمرار في استخدام Drizzle لتعريف الـ schema وتوليد migrations، مع مزامنتها يدوياً مع `supabase/migrations/`.

**سبب الرفض:** يُبقي على مشكلة ازدواجية مصدر الحقيقة ويزيد تعقيد الصيانة. ميزات Supabase الأساسية (RLS، functions) لا تُعبَّر عنها بشكل طبيعي في Drizzle.

### البديل 2: Prisma بدلاً من Drizzle

استبدال Drizzle بـ Prisma كـ ORM مع Supabase.

**سبب الرفض:** نفس مشكلة الازدواجية. Prisma يُضيف تعقيداً إضافياً (Prisma Client، Prisma Migrate) مع نفس القيود على ميزات Supabase المتقدمة. حجم bundle أكبر غير مناسب لـ Edge Functions.

### البديل 3: Supabase CLI فقط بدون migrations يدوية

استخدام `supabase db diff` لتوليد migrations تلقائياً من تغييرات الـ schema في Supabase Studio.

**سبب الرفض:** يُفقد التحكم الكامل في الـ migrations ويجعل code review أصعب. الـ migrations اليدوية أوضح وأكثر قابلية للتدقيق في Git history.
