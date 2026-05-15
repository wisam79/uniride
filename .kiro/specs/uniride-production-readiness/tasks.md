# Implementation Plan: UniRide Production Readiness

## Overview

خطة تنفيذ المتطلبات العشرين لتحسين جاهزية UniRide للإنتاج. المهام مرتبة حسب التبعيات — المتطلبات بدون تبعيات أولاً، ثم المتطلبات التي تعتمد على غيرها.

**لغة التنفيذ:** TypeScript (apps/admin, apps/mobile, packages/core) + SQL (migrations) + Deno TypeScript (Edge Functions)

---

## Tasks

- [x] 1. REQ-4: إنشاء ملف CODEOWNERS
  - أنشئ `.github/CODEOWNERS` بالمحتوى المحدد في design.md
  - عيّن `@uniride/admin-frontend` لـ `apps/admin/`
  - عيّن `@uniride/mobile` لـ `apps/mobile/`
  - عيّن `@uniride/backend` لـ `supabase/`
  - عيّن `@uniride/core-lib` لـ `packages/core/`
  - عيّن `@uniride/devops` لـ `.github/workflows/` و`supabase/migrations/`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 2. REQ-10: إنشاء ADR Template ومجلد التوثيق
  - أنشئ مجلد `docs/adr/`
  - أنشئ `docs/adr/README.md` يشرح عملية ADR واصطلاح التسمية `NNNN-kebab-case-title.md`
  - أنشئ `docs/adr/0000-template.md` بالأقسام: Title, Date, Status, Context, Decision, Consequences, Alternatives Considered, Superseded By
  - أنشئ `docs/adr/0001-use-supabase-migrations-as-source-of-truth.md` يوثّق قرار حذف Drizzle واستخدام Supabase Migrations
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 3. REQ-8: إضافة HTTP Security Headers للـ Admin Dashboard
  - عدّل `apps/admin/next.config.ts` لإضافة دالة `headers()`
  - أضف الترويسات الست: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP, Permissions-Policy
  - استخرج `supabaseDomain` من `NEXT_PUBLIC_SUPABASE_URL` لاستخدامه في CSP
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]\* 3.1 اكتب unit test للتحقق من وجود الترويسات الست
    - تحقق من أن `headers()` تُعيد مصفوفة تحتوي على المفاتيح الصحيحة
    - _Requirements: 8.1–8.6_

- [x] 4. REQ-9: إضافة Soft Delete للرحلات والاشتراكات
  - أنشئ `supabase/migrations/2026051201_soft_delete_trips_subscriptions.sql`
  - أضف `deleted_at TIMESTAMPTZ DEFAULT NULL` على جدولي `trips` و`subscriptions`
  - أنشئ partial indexes: `idx_trips_not_deleted` و`idx_subscriptions_not_deleted`
  - حدّث RLS policies الموجودة لإضافة `AND deleted_at IS NULL` في شرط `USING`
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 5. REQ-3: إعداد Commitlint
  - ثبّت `@commitlint/cli` و`@commitlint/config-conventional` كـ devDependencies في root: `pnpm add -D -w @commitlint/cli @commitlint/config-conventional`
  - أنشئ `commitlint.config.js` في root بـ `extends: ['@commitlint/config-conventional']`
  - عدّل `.husky/_/commit-msg` لتشغيل `npx --no -- commitlint --edit "$1"`
  - لا تُعدّل أي hook آخر (`pre-commit`, `pre-push`)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 6. REQ-1: تفعيل Strict TypeScript
  - [x] 6.1 عدّل `apps/admin/tsconfig.json` لإضافة `"noUncheckedIndexedAccess": true` و`"exactOptionalPropertyTypes": true` صراحةً في `compilerOptions`
    - _Requirements: 1.1, 1.2_
  - [x] 6.2 عدّل `apps/mobile/tsconfig.json` بنفس الخيارين
    - _Requirements: 1.1, 1.2_
  - [x] 6.3 أنشئ أو عدّل `packages/core/tsconfig.json` بالخيارين مع `"strict": true`
    - _Requirements: 1.1, 1.2, 1.7_
  - [x] 6.4 أضف script `"typecheck": "tsc --noEmit"` في `package.json` لكل من `apps/admin`, `apps/mobile`, `packages/core`
    - _Requirements: 1.8_
  - [-] 6.5 أصلح جميع أخطاء TypeScript الناتجة عن تفعيل الخيارين في الكود الحالي (optional chaining، فحوصات undefined)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ]\* 6.6 تحقق من أن `pnpm -r typecheck` يخرج بكود 0 بعد الإصلاحات
    - _Requirements: 1.6_

- [ ] 7. REQ-2: إنشاء Error Boundary (يعتمد على REQ-1)
  - [-] 7.1 أنشئ `apps/mobile/src/components/ErrorBoundary.tsx` كـ React class component
    - نفّذ `static getDerivedStateFromError(error)` يُعيد `{ hasError: true, error }`
    - نفّذ `componentDidCatch(error, info)` يستدعي `logger.error(error.message, { componentStack: info.componentStack })`
    - أضف state: `{ hasError: boolean, error: Error | null, retryCount: number }`
    - _Requirements: 2.1, 2.3_
  - [~] 7.2 أضف الـ fallback UI في `ErrorBoundary`
    - اعرض وصف الخطأ (max 200 حرف) وزر "إعادة المحاولة"
    - عطّل الزر بعد 3 محاولات متتالية واعرض رسالة إعادة التشغيل
    - إذا رمى الـ fallback نفسه خطأً، اعرض نص ثابت مُشفَّر بدون بيانات ديناميكية
    - _Requirements: 2.2, 2.5, 2.6, 2.7_
  - [~] 7.3 غلّف root navigator في `apps/mobile/app/_layout.tsx` بـ `<ErrorBoundary>`
    - _Requirements: 2.4_

  - [ ]\* 7.4 اكتب unit tests لـ ErrorBoundary
    - اختبر: catch خطأ + عرض fallback
    - اختبر: استدعاء `logger.error` عند الخطأ
    - اختبر: تعطيل الزر بعد 3 محاولات
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

- [ ] 8. REQ-6: استبدال Polling بـ NetInfo (يعتمد على REQ-1)
  - ثبّت `@react-native-community/netinfo`: `pnpm add @react-native-community/netinfo --filter @uniride/mobile`
  - أعد كتابة `apps/mobile/src/hooks/useNetworkStatus.ts` بالكامل
  - أزل `setInterval`, `AppState.addEventListener`, و`supabase.rpc('ping')` من هذا الـ hook
  - نفّذ دالة `evaluateState(state: NetInfoState): boolean` بالمنطق المحدد في design.md
  - استدعِ `NetInfo.fetch()` مرة واحدة عند mount للحالة الأولية
  - استدعِ `NetInfo.addEventListener` وأعد unsubscribe في cleanup
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]\* 8.1 اكتب property test لدالة `evaluateState`
    - **Property 4: NetInfo online evaluation is deterministic**
    - **Validates: Requirements 6.5, 6.6, 6.7, 6.8**
    - ولّد `NetInfoState` عشوائية وتحقق من المنطق الصحيح لكل حالة

- [ ] 9. REQ-7: تنظيف Push Tokens المنتهية الصلاحية (يعتمد على REQ-1)
  - عدّل `supabase/functions/send-notification/index.ts`
  - عدّل query الـ `push_tokens` لتشمل `user_id` أيضاً: `.select('token, user_id')`
  - أضف دالة `cleanupInvalidTokens(supabaseAdmin, results, pushTokens)` كما في design.md
  - استدعِ `cleanupInvalidTokens` بعد إرسال الاستجابة (fire-and-forget)
  - سجّل `info` عند حذف token ناجح (user_id + أول 20 حرف من الـ token)
  - سجّل `error` إذا فشل الحذف مع سبب الفشل
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]\* 9.1 اكتب unit test لـ `cleanupInvalidTokens`
    - mock Expo API response بـ `DeviceNotRegistered`
    - تحقق من حذف الـ token الخاطئ فقط وإبقاء الصالح
    - _Requirements: 7.1, 7.4_

- [ ] 10. REQ-5: Secure Storage Adapter (يعتمد على REQ-1)
  - ثبّت `expo-secure-store`: `pnpm add expo-secure-store --filter @uniride/mobile`
  - [-] 10.1 أنشئ `apps/mobile/src/lib/secureStorage.ts`
    - نفّذ `secureStorage` adapter بـ `getItem`, `setItem`, `removeItem`
    - أضف fallback إلى AsyncStorage مع `logger.warn('SecureStore unavailable, falling back to AsyncStorage', { key })`
    - _Requirements: 5.4, 5.5_
  - [~] 10.2 عدّل `apps/mobile/src/hooks/useStore.ts`
    - استبدل `createJSONStorage(() => AsyncStorage)` بـ `createJSONStorage(() => secureStorage)` في `useAuthStore` و`useBookingStore` فقط
    - أبقِ `useTripStore` و`useI18nStore` على AsyncStorage
    - _Requirements: 5.1, 5.2, 5.6_
  - [~] 10.3 أضف منطق تنظيف SecureStore عند logout
    - في دالة logout أو في `_layout.tsx`، استدعِ `SecureStore.deleteItemAsync` للمفاتيح الثلاثة: `auth-storage`, `booking-storage`, `@uniride_active_subscription`
    - _Requirements: 5.7_

  - [ ]\* 10.4 اكتب property test لـ secureStorage adapter
    - **Property 7: SecureStore round-trip preserves data**
    - **Validates: Requirements 5.4**
    - ولّد strings عشوائية وتحقق من أن setItem ثم getItem يُعيد نفس القيمة

- [~] 11. Checkpoint — تحقق من الفئة الأولى
  - شغّل `pnpm -r typecheck` وتأكد من خروجه بكود 0
  - شغّل `pnpm test` وتأكد من نجاح جميع الاختبارات
  - تأكد من وجود الملفات: `.github/CODEOWNERS`, `docs/adr/`, `commitlint.config.js`
  - اسأل المستخدم إذا كان هناك أي أسئلة قبل المتابعة

- [ ] 12. REQ-13: Exponential Backoff Utility (يعتمد على REQ-1)
  - [~] 12.1 أضف `RetryOptions` interface و`retryWithBackoff` function في `packages/core/index.ts`
    - نفّذ المنطق: `delay = Math.min(baseDelayMs * 2^attempt + jitter, maxDelayMs)`
    - `jitter` = عدد صحيح عشوائي في `[0, baseDelayMs)`
    - `attempt` يبدأ من 0
    - لا تستورد React أو Expo أو Supabase
    - _Requirements: 13.1, 13.2, 13.3, 13.7_
  - [~] 12.2 تأكد من السلوك الصحيح عند الاستنفاد والـ shouldRetry
    - يُرمى خطأ المحاولة الأخيرة مباشرةً (لا wrapper)
    - `shouldRetry=false` → رمي فوري بدون تأخير
    - _Requirements: 13.4, 13.5, 13.6_

  - [ ]\* 12.3 اكتب property tests لـ `retryWithBackoff` في `packages/core/index.test.ts`
    - **Property 1: Retry resolves after N failures then success**
    - **Validates: Requirements 13.8**
    - ولّد `failCount` عشوائي (0 إلى maxRetries) وتحقق من الحل الصحيح
    - **Property 2: Retry throws last error after exhaustion**
    - **Validates: Requirements 13.4**
    - **Property 3: shouldRetry=false causes immediate throw**
    - **Validates: Requirements 13.5**

- [ ] 13. REQ-14: Offline Data Encryption (يعتمد على REQ-5)
  - أعد كتابة `apps/mobile/src/lib/offlineCache.ts` بالكامل لاستخدام `expo-secure-store`
  - استخدم `SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED })`
  - أضف فحص حجم الـ payload (max 2048 bytes) مع `logger.warn` عند التجاوز
  - عند JSON تالف: احذف المفتاح وأعد `null`
  - احفظ فحص `end_date` الموجود
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ]\* 13.1 اكتب property test لـ `OfflineCache`
    - **Property 7: SecureStore round-trip preserves data**
    - **Validates: Requirements 14.2, 14.3**
    - ولّد `Subscription` objects عشوائية (مع `end_date` مستقبلي) وتحقق من round-trip

- [ ] 14. REQ-11: Sentry Integration (يعتمد على REQ-2)
  - [~] 14.1 ثبّت Sentry في mobile وadmin
    - `pnpm add @sentry/react-native --filter @uniride/mobile`
    - `pnpm add @sentry/nextjs --filter @uniride/admin`
  - [~] 14.2 أنشئ `apps/mobile/src/lib/sentry.ts`
    - نفّذ `initSentry()` مع DSN من `EXPO_PUBLIC_SENTRY_DSN`
    - إذا لم يُهيَّأ DSN: لا تُرمى أخطاء
    - `environment`: `'development'` إذا `__DEV__`، وإلا `'production'`
    - _Requirements: 11.1, 11.5, 11.6, 11.8_
  - [~] 14.3 عدّل `apps/mobile/src/lib/logger.ts`
    - في دالة `error()`: أضف `Sentry.captureException(new Error(message), { extra: context })` مُغلَّفاً بـ try/catch
    - _Requirements: 11.3, 11.7_
  - [~] 14.4 أنشئ `apps/admin/sentry.client.config.ts` و`apps/admin/sentry.server.config.ts`
    - DSN من `NEXT_PUBLIC_SENTRY_DSN`
    - _Requirements: 11.2, 11.4, 11.5_

  - [ ]\* 14.5 اكتب unit test للتحقق من أن Sentry لا يُرمى خطأ عند غياب DSN
    - _Requirements: 11.8_

- [ ] 15. REQ-12: OpenTelemetry للـ Edge Functions (يعتمد على REQ-13)
  - [~] 15.1 أنشئ `supabase/functions/_shared/otel.ts`
    - نفّذ `initOtel(serviceName)` مع OTLP HTTP exporter
    - إذا لم يُهيَّأ `OTEL_EXPORTER_OTLP_ENDPOINT`: أعد no-op tracer بدون أخطاء
    - نفّذ `startSpan(tracer, name, fn)` مع معالجة الأخطاء وتسجيل `SpanStatusCode.ERROR`
    - _Requirements: 12.4, 12.5, 12.7_
  - [~] 15.2 عدّل `supabase/functions/trip-engine/index.ts`
    - استورد `initOtel` و`startSpan` من `../_shared/otel.ts`
    - غلّف handler الرئيسي بـ root span مع attributes: function name, HTTP method, path
    - أضف child spans لاستدعاءات Supabase RPC
    - اقرأ `traceparent` header من الطلب الوارد
    - _Requirements: 12.1, 12.2, 12.3, 12.6_
  - [~] 15.3 عدّل `supabase/functions/send-notification/index.ts` بنفس النمط
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]\* 15.4 اكتب unit test للتحقق من no-op mode عند غياب OTEL_EXPORTER_OTLP_ENDPOINT
    - _Requirements: 12.5_

- [ ] 16. REQ-18: HMAC Webhook Verification (يعتمد على REQ-13)
  - عدّل `supabase/functions/zaincash-webhook/index.ts`
  - أضف دالة `verifyHmacSignature(body, signature, secret)` باستخدام `crypto.subtle` المدمج في Deno
  - نفّذ constant-time comparison لمنع timing attacks
  - أضف منطق التحقق في بداية الـ handler:
    - غياب `X-ZainCash-Signature` → 400
    - غياب `ZAINCASH_SECRET` → log warn + 503
    - signature خاطئ → log warn (IP + أول 8 أحرف) + 401
    - signature صحيح → تابع المنطق الحالي
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [ ]\* 16.1 اكتب property test لـ `verifyHmacSignature`
    - **Property 6: HMAC verification is constant-time**
    - **Validates: Requirements 18.2**
    - ولّد body وsecret عشوائيين وتحقق من أن HMAC صحيح يُعيد true وخاطئ يُعيد false

- [ ] 17. REQ-19: Optimistic UI Updates (يعتمد على REQ-13)
  - [~] 17.1 عدّل `useDriverTrips` في `apps/mobile/src/hooks/useTrips.ts`
    - أضف `isPending: boolean` state
    - أضف `updateTripStatus(tripId, newStatus)` function
    - نفّذ: تحقق من `canTransition` → snapshot → تحديث optimistic → استدعاء خادم → re-fetch أو rollback
    - أضف timeout 30 ثانية للـ rollback التلقائي
    - _Requirements: 19.1, 19.3, 19.4, 19.5, 19.6, 19.8_
  - [~] 17.2 عدّل `useSubscriptions` في `apps/mobile/src/hooks/useTrips.ts`
    - أضف `cancelSubscription(subscriptionId)` function مع نفس نمط optimistic update
    - تحديث optimistic: `status → 'cancelled'`
    - عند نجاح الخادم: re-fetch كامل (لا merge مباشر)
    - _Requirements: 19.2, 19.3, 19.4, 19.5_
  - [~] 17.3 تأكد من معالجة Realtime أثناء `isPending`
    - استخدم `isPendingRef` (useRef) داخل callback الـ Realtime لتجنب stale closure
    - إذا وصل حدث Realtime أثناء `isPending`: تجاهل الـ optimistic state وطبّق قيمة الخادم
    - _Requirements: 19.7_

  - [ ]\* 17.4 اكتب property test لـ optimistic rollback
    - **Property 5: Optimistic rollback preserves snapshot**
    - **Validates: Requirements 19.4**
    - ولّد قوائم رحلات عشوائية وتحقق من أن الـ rollback يُعيد نفس الـ snapshot

- [ ] 18. REQ-20: pg_stat_statements (يعتمد على REQ-9)
  - [-] 18.1 أنشئ `supabase/migrations/2026051202_pg_stat_statements.sql`
    - `CREATE EXTENSION IF NOT EXISTS pg_stat_statements`
    - أنشئ view `public.slow_queries` تُعيد top 20 استعلاماً مرتبة بـ `mean_exec_time DESC`
    - الأعمدة: `query`, `calls`, `mean_exec_time` (مقرّب لمنزلتين), `total_exec_time`, `rows`
    - `GRANT SELECT ON public.slow_queries TO authenticated`
    - _Requirements: 20.1, 20.2, 20.3, 20.6_
  - [~] 18.2 عدّل `apps/admin/src/app/analytics/page.tsx`
    - أضف interface `SlowQuery` وstate `slowQueries` و`queryMonitoringAvailable`
    - أضف دالة `fetchSlowQueries` تستعلم من `slow_queries` view
    - أضف قسم "Query Performance" في نهاية الصفحة بجدول قابل للفرز
    - اعرض `mean_exec_time` بـ ms مقرّباً لمنزلتين عشريتين
    - عند خطأ: اعرض "Query monitoring not available" بدون crash
    - _Requirements: 20.4, 20.5, 20.7_

  - [ ]\* 18.3 اكتب unit test للتحقق من graceful fallback عند غياب الامتداد
    - mock الـ Supabase client ليُعيد خطأ
    - تحقق من عرض رسالة "Query monitoring not available"
    - _Requirements: 20.7_

- [~] 19. Checkpoint — تحقق من الفئة الثانية (جزء أول)
  - شغّل `pnpm test` وتأكد من نجاح جميع الاختبارات
  - تحقق من أن `pnpm -r typecheck` يخرج بكود 0
  - اسأل المستخدم إذا كان هناك أي أسئلة

- [ ] 20. REQ-17: Semantic Release (يعتمد على REQ-3)
  - ثبّت semantic-release وplugins في root:
    ```
    pnpm add -D -w semantic-release @semantic-release/commit-analyzer @semantic-release/release-notes-generator @semantic-release/changelog @semantic-release/git
    ```
  - أنشئ `.releaserc.json` في root بالإعداد المحدد في design.md
  - أنشئ `.github/workflows/release.yml` يُشغَّل فقط عند push إلى `main`
  - تأكد من أن workflow يستخدم `fetch-depth: 0` لقراءة كامل تاريخ الـ commits
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

- [ ] 21. REQ-15: Contract Testing بـ Pact (يعتمد على REQ-13)
  - ثبّت `@pact-foundation/pact`: `pnpm add -D @pact-foundation/pact --filter @uniride/mobile`
  - [~] 21.1 أنشئ `apps/mobile/src/tests/pact/trip-engine.pact.test.ts`
    - عرّف consumer contract للـ `trip-engine` Edge Function
    - تحقق من أن request body يتطابق مع `TripUpdateRequest` Zod schema من `packages/core`
    - _Requirements: 15.1, 15.2_
  - [~] 21.2 أنشئ `apps/mobile/src/tests/pact/send-notification.pact.test.ts`
    - عرّف consumer contract للـ `send-notification` Edge Function
    - تحقق من وجود `targetUserId`, `title`, `body` بالأنواع الصحيحة
    - _Requirements: 15.1, 15.3_
  - [~] 21.3 أنشئ مجلد `packages/core/pacts/` وأضف ملفات `.json` المُولَّدة
    - _Requirements: 15.6_
  - [~] 21.4 أضف Pact tests في `.github/workflows/ci.yml` بعد unit tests
    - _Requirements: 15.7_

- [ ] 22. REQ-16: Load Testing بـ k6 (يعتمد على REQ-20)
  - أنشئ مجلد `tests/load/`
  - [~] 22.1 أنشئ `tests/load/trip-engine.js`
    - 50 virtual users لمدة 60 ثانية
    - threshold: p95 < 500ms
    - اقرأ URL وtoken من `K6_BASE_URL` و`K6_SERVICE_ROLE_KEY`
    - _Requirements: 16.1, 16.3, 16.5, 16.6, 16.7_
  - [~] 22.2 أنشئ `tests/load/activate-license.js`
    - 20 virtual users لمدة 60 ثانية
    - threshold: error rate < 1% (باستثناء `rate_limit_exceeded`)
    - كود ترخيص فريد لكل iteration
    - _Requirements: 16.2, 16.4, 16.5, 16.6, 16.7_

- [~] 23. Final Checkpoint — تحقق النهائي
  - شغّل `pnpm -r typecheck` وتأكد من خروجه بكود 0
  - شغّل `pnpm test` وتأكد من نجاح جميع الاختبارات
  - تحقق من وجود جميع الملفات الجديدة المحددة في design.md
  - تحقق من أن migration files تتبع نمط التسمية `YYYYMMDDNN_description.sql`
  - اسأل المستخدم إذا كان هناك أي أسئلة قبل الإغلاق

---

## Notes

- المهام المُعلَّمة بـ `*` اختيارية ويمكن تخطيها للحصول على MVP أسرع
- كل مهمة تُشير للمتطلبات المحددة للتتبع
- **ترتيب التبعيات الحرج:**
  - REQ-5 يجب أن يسبق REQ-14
  - REQ-3 يجب أن يسبق REQ-17
  - REQ-1 يجب أن يسبق REQ-2, REQ-6, REQ-7, REQ-5, REQ-13
  - REQ-9 يجب أن يسبق REQ-20
  - REQ-2 يجب أن يسبق REQ-11
  - REQ-13 يجب أن يسبق REQ-12, REQ-18, REQ-19
- **قواعد AGENTS.md الحرجة:**
  - لا تستخدم `user_metadata` — استخدم `app_metadata` فقط
  - لا تدمج `payload.new` مباشرة في Realtime — أعد fetch كامل
  - Migration naming: `YYYYMMDDNN_description.sql`
  - لا تستخدم `pageSize: 0` — استخدم RPCs
- Property tests تستخدم `fast-check` بـ 100 iteration كحد أدنى

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2", "3", "4", "5", "6"],
      "description": "No dependencies — REQ-4, REQ-10, REQ-8, REQ-9, REQ-3, REQ-1"
    },
    {
      "wave": 2,
      "tasks": ["7", "8", "9", "10", "12"],
      "description": "Depends on REQ-1 — REQ-2, REQ-6, REQ-7, REQ-5, REQ-13"
    },
    {
      "wave": 3,
      "tasks": ["11", "13", "14", "15", "16", "17", "18"],
      "description": "Depends on wave 2 — REQ-14, REQ-11, REQ-12, REQ-18, REQ-19, REQ-20"
    },
    {
      "wave": 4,
      "tasks": ["19", "20", "21", "22"],
      "description": "Depends on wave 3 — REQ-17, REQ-15, REQ-16 + checkpoint"
    },
    {
      "wave": 5,
      "tasks": ["23"],
      "description": "Final checkpoint"
    }
  ]
}
```
