# UniRide v3 — منصة النقل الذكي للجامعة 🎓

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Tests](https://img.shields.io/badge/tests-123%20passing-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.2.6-000000.svg?logo=next.js)
![Expo](https://img.shields.io/badge/Expo-54-000020.svg?logo=expo)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Edge-3ECF8E.svg?logo=supabase)
![License](https://img.shields.io/badge/license-private-red.svg)

UniRide هو منصة نقل ذكي للطلاب الجامعيين في العراق. تربط الطلاب بالسائقين عبر نظام تراخيص مدفوعة مسبقاً مع تتبع GPS حي وإشعارات فورية.

---

## 📚 التوثيق

| الملف                                              | المحتوى                                         |
| -------------------------------------------------- | ----------------------------------------------- |
| [GETTING_STARTED.md](./docs/v2/GETTING_STARTED.md) | الإعداد المحلي، متغيرات البيئة، تشغيل التطبيقات |
| [ARCHITECTURE.md](./docs/v2/ARCHITECTURE.md)       | البنية المعمارية، تدفق البيانات، قرارات التصميم |
| [API_REFERENCE.md](./docs/v2/API_REFERENCE.md)     | Edge Functions، RPCs، الـ payloads والاستجابات  |
| [SECURITY.md](./docs/v2/SECURITY.md)               | JWT، RLS، التزامنية، Rate Limiting              |
| [STATE_MACHINE.md](./docs/v2/STATE_MACHINE.md)     | دورة حياة الرحلة والاشتراك                      |
| [CONTRIBUTING.md](./docs/v2/CONTRIBUTING.md)       | معايير الكود، الاختبارات، سير العمل             |
| [AGENTS.md](./AGENTS.md)                           | تعليمات AI agents العاملة على المشروع           |

---

## 🏗️ البنية السريعة

```
uniride/                          ← Monorepo (pnpm workspaces)
├── apps/
│   ├── admin/                    ← Next.js 16 + Refine + MUI (لوحة التحكم)
│   └── mobile/                   ← Expo 54 + React Native (تطبيق الطلاب/السائقين)
├── packages/
│   └── core/                     ← Zod schemas, state machine, i18n
└── supabase/
    ├── functions/                ← Edge Functions (Deno)
    └── migrations/               ← SQL migrations (مصدر الحقيقة الوحيد)
```

---

## ⚡ البدء السريع

```bash
# 1. تثبيت الحزم
pnpm install

# 2. إعداد البيئة
cp .env.example .env
# عدّل .env بقيم Supabase الخاصة بك

# 3. تشغيل لوحة التحكم
pnpm --filter admin-dashboard dev   # http://localhost:3000

# 4. تشغيل التطبيق المحمول
pnpm --filter mobile-app start      # Expo Go / Emulator
```

---

## 🌟 المميزات الرئيسية

| الميزة                 | التفاصيل                                                   |
| ---------------------- | ---------------------------------------------------------- |
| **نظام التراخيص**      | أكواد مدفوعة مسبقاً بدلاً من الحجز المباشر — يمنع الاحتيال |
| **تتبع GPS حي**        | تحديث كل 5 ثوانٍ مع queue للعمل offline                    |
| **Offline-First**      | الاشتراكات تعمل بدون إنترنت عبر AsyncStorage cache         |
| **Feature Flags**      | تفعيل/تعطيل الميزات مباشرة من لوحة التحكم بدون نشر         |
| **أمان متعدد الطبقات** | JWT + RLS + app_metadata + Rate Limiting + Idempotency     |
| **لا Overbooking**     | `FOR UPDATE NOWAIT` pessimistic locking في PostgreSQL      |
| **Realtime**           | تحديثات فورية للرحلات والخطوط عبر Supabase Realtime        |

---

## 🧪 الاختبارات

```bash
pnpm test              # 123 اختبار (unit + integration)
pnpm test -- --coverage  # مع تقرير التغطية
pnpm test:e2e          # E2E (Playwright)
```

**نتائج الاختبارات الحالية:** 123/123 ✅

---

## 🚀 النشر

```bash
# قاعدة البيانات
supabase db push

# Edge Functions
supabase functions deploy send-notification
supabase functions deploy trip-engine

# لوحة التحكم
pnpm --filter admin-dashboard build
# ثم انشر مجلد .next على Vercel/Netlify
```

راجع [deploy.md](./deploy.md) للدليل الكامل.

---

## 📊 الإصدارات

| الإصدار | التاريخ    | الأبرز                                                                            |
| ------- | ---------- | --------------------------------------------------------------------------------- |
| v3.0.0  | 2026-05-12 | Feature Flags، صفحات Trips/Subscriptions، cancel_subscription RPC، CORS hardening |
| v2.1.0  | 2026-05-12 | Analytics، Institutions، Logger، Offline Cache                                    |
| v2.0.0  | 2026-05-10 | إعادة بناء كاملة — License system، GPS tracking، RLS                              |

---

> **الإصدار الحالي:** v3.0.0 — Production ref: `zpcvvyxtmxzplmojobbv`
