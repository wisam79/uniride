# Architecture Decision Records (ADR)

هذا المجلد يحتوي على توثيق القرارات المعمارية لمشروع UniRide.

---

## ما هو ADR؟

**Architecture Decision Record** هو وثيقة قصيرة تُسجّل قراراً معمارياً مهماً اتُّخذ في المشروع، مع سياقه ومبرراته والبدائل التي تم النظر فيها. الهدف هو أن يفهم أي مطوّر جديد _لماذا_ اتُّخذ القرار، وليس فقط _ماذا_ تم اختياره.

---

## عملية إنشاء ADR جديد

1. **انسخ الـ template:** `docs/adr/0000-template.md`
2. **سمّ الملف** وفق الاصطلاح: `NNNN-kebab-case-title.md`
   - `NNNN` = رقم تسلسلي من أربعة أرقام (مثل `0002`, `0003`)
   - `kebab-case-title` = عنوان مختصر بالإنجليزية بالشرطات
   - مثال: `0002-use-expo-secure-store-for-auth-tokens.md`
3. **املأ الأقسام** بالكامل: Context, Decision, Consequences, Alternatives Considered
4. **حدّد الحالة:** `Proposed` عند الإنشاء، ثم `Accepted` بعد موافقة الفريق
5. **أضف الـ ADR** إلى قائمة "الـ ADRs الموجودة" في هذا الملف
6. **ادمج في `main`** عبر Pull Request عادي

---

## اصطلاح التسمية

```
NNNN-kebab-case-title.md

✅ 0001-use-supabase-migrations-as-source-of-truth.md
✅ 0002-use-expo-secure-store-for-auth-tokens.md
❌ adr-supabase.md          (بدون رقم)
❌ 1-supabase.md            (رقم غير مكتمل)
❌ 0001_supabase.md         (شرطة سفلية بدل شرطة عادية)
```

---

## حالات ADR

| الحالة       | المعنى                                                        |
| ------------ | ------------------------------------------------------------- |
| `Proposed`   | القرار مقترح ولم يُوافَق عليه بعد                             |
| `Accepted`   | القرار مُوافَق عليه ومُطبَّق                                  |
| `Deprecated` | القرار لا يزال مُطبَّقاً لكنه غير موصى به للاستخدام الجديد    |
| `Superseded` | القرار استُبدل بـ ADR آخر (يُشار إليه في حقل `Superseded By`) |

---

## الـ ADRs الموجودة

| الرقم                                                        | العنوان                                    | الحالة   | التاريخ    |
| ------------------------------------------------------------ | ------------------------------------------ | -------- | ---------- |
| [0000](./0000-template.md)                                   | Template                                   | —        | —          |
| [0001](./0001-use-supabase-migrations-as-source-of-truth.md) | Use Supabase Migrations as Source of Truth | Accepted | 2026-05-12 |

---

## مراجع

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions — Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
