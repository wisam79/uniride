# Requirements Document

## Introduction

هذه الوثيقة تغطي متطلبات تحسين جودة مشروع UniRide وجاهزيته للإنتاج، مقسّمة إلى فئتين:

- **الفئة الأولى (أسبوع واحد):** تحسينات سريعة ومجانية تشمل TypeScript الصارم، الأمان، وجودة الكود.
- **الفئة الثانية (شهر–شهرين):** تحسينات متوسطة تشمل المراقبة، الاختبار، والأداء.

المشروع هو Monorepo بـ pnpm يحتوي على:

- `apps/admin` — Next.js + Refine + MUI
- `apps/mobile` — Expo + React Native
- `packages/core` — Zod schemas, i18n, state machine
- `supabase/` — Edge Functions (Deno) + SQL Migrations

---

## Glossary

- **TypeScript_Compiler:** مترجم TypeScript المُهيَّج في `tsconfig.json` لكل package.
- **Error_Boundary:** مكوّن React يلتقط أخطاء JavaScript في شجرة المكوّنات الفرعية.
- **Commitlint:** أداة تتحقق من صيغة رسائل Git commits وفق معيار Conventional Commits.
- **CODEOWNERS:** ملف GitHub يُحدد المالكين المسؤولين عن مراجعة أجزاء الكود.
- **SecureStore:** مكتبة `expo-secure-store` التي تخزّن البيانات مشفّرة في Keychain/Keystore.
- **NetInfo:** مكتبة `@react-native-community/netinfo` لمراقبة حالة الشبكة عبر أحداث النظام.
- **Push_Token:** رمز تعريف جهاز المستخدم لدى Expo Push Notification Service.
- **Notification_Service:** Edge Function `send-notification` المسؤولة عن إرسال الإشعارات.
- **HTTP_Security_Headers:** ترويسات HTTP تحمي المتصفح من هجمات XSS وClickjacking وغيرها.
- **Soft_Delete:** نمط حذف يُضيف عمود `deleted_at` بدلاً من حذف السجل فعلياً.
- **ADR:** Architecture Decision Record — وثيقة تسجّل قرارات معمارية مع سياقها ومبرراتها.
- **Sentry:** منصة مراقبة الأخطاء والأداء في الوقت الفعلي.
- **OpenTelemetry:** معيار مفتوح لجمع بيانات المراقبة الموزعة (traces, metrics, logs).
- **Backoff_Utility:** دالة مشتركة في `packages/core` تُنفّذ إعادة المحاولة بتأخير أسي مع jitter.
- **Pact:** إطار Contract Testing يتحقق من توافق API بين المستهلك والمزوّد.
- **k6:** أداة Load Testing مفتوحة المصدر لاختبار الأداء تحت الضغط.
- **Semantic_Release:** أداة أتمتة الإصدارات والـ changelog بناءً على Conventional Commits.
- **HMAC:** Hash-based Message Authentication Code — آلية تحقق من صحة وسلامة الطلبات الواردة.
- **Optimistic_UI:** نمط واجهة يُحدّث الحالة المحلية فوراً قبل تأكيد الخادم.
- **pg_stat_statements:** امتداد PostgreSQL يجمع إحصائيات تنفيذ الاستعلامات.
- **Migration:** ملف SQL في `supabase/migrations/` يُطبَّق بترتيب على قاعدة البيانات.
- **DeviceNotRegistered:** خطأ Expo يُشير إلى أن Push Token لم يعد صالحاً.
- **CSP:** Content Security Policy — سياسة أمان تتحكم في مصادر المحتوى المسموح بتحميلها.
- **HSTS:** HTTP Strict Transport Security — ترويسة تُجبر المتصفح على استخدام HTTPS فقط.

---

## Requirements

---

# الفئة الأولى — تحسينات سريعة (أسبوع واحد)

---

### المتطلب 1: Strict TypeScript — تفعيل خيارات الصرامة

**User Story:** بوصفي مطوراً، أريد تفعيل `noUncheckedIndexedAccess` و`exactOptionalPropertyTypes` في tsconfig، حتى يكتشف المترجم أخطاء الوصول للمصفوفات والخصائص الاختيارية في وقت البناء بدلاً من وقت التشغيل.

#### معايير القبول

1. THE TypeScript_Compiler SHALL enforce `"noUncheckedIndexedAccess": true` in the `compilerOptions` section of `tsconfig.json` in each of `apps/admin`, `apps/mobile`, and `packages/core` — the option must be explicit in each file, not inherited from a base config.
2. THE TypeScript_Compiler SHALL enforce `"exactOptionalPropertyTypes": true` in the `compilerOptions` section of `tsconfig.json` in each of `apps/admin`, `apps/mobile`, and `packages/core` — the option must be explicit in each file, not inherited.
3. WHEN `noUncheckedIndexedAccess` is enabled, THE TypeScript_Compiler SHALL require explicit undefined checks before accessing array or object index results (e.g., `arr[0]` has type `T | undefined`).
4. WHEN `exactOptionalPropertyTypes` is enabled, THE TypeScript_Compiler SHALL reject assignments where an optional property is explicitly set to `undefined` instead of being omitted.
5. WHEN either strict option is enabled and existing code violates it, THE TypeScript_Compiler SHALL emit a compile-time error that identifies the file and line number.
6. IF all violations in existing code are resolved, THEN `pnpm typecheck` SHALL exit with code 0 and zero errors across all three workspaces (`apps/admin`, `apps/mobile`, `packages/core`).
7. IF `packages/core` does not have a `tsconfig.json`, THEN one SHALL be created with `compilerOptions` containing both strict options and `"strict": true`.
8. EACH of `apps/admin`, `apps/mobile`, and `packages/core` SHALL define a `typecheck` script in their `package.json` that runs `tsc --noEmit`, so that `pnpm -r typecheck` executes all three.

---

### المتطلب 2: Error Boundary — التقاط أعطال Mobile

**User Story:** بوصفي مستخدماً للتطبيق، أريد أن يعرض التطبيق شاشة خطأ واضحة بدلاً من التعطل الكامل عند حدوث استثناء غير متوقع، حتى أتمكن من إعادة المحاولة دون إعادة تشغيل التطبيق يدوياً.

#### معايير القبول

1. THE Error_Boundary SHALL be a React class component that implements both `componentDidCatch(error, info)` and `static getDerivedStateFromError(error)`.
2. WHEN a JavaScript error is thrown during rendering or in a lifecycle method of a component inside the Error_Boundary tree, THE Error_Boundary SHALL catch the error and render a fallback UI instead of propagating the crash. (Note: async errors and event handler errors are not caught by Error Boundaries and are out of scope.)
3. WHEN an error is caught, THE Error_Boundary SHALL call `logger.error` with the error message and the `componentStack` string from React's `componentDidCatch` `info` parameter.
4. THE Error_Boundary SHALL wrap the root navigator in `apps/mobile/app/_layout.tsx` so all screens are protected.
5. WHEN the fallback UI is displayed, THE Error_Boundary SHALL render a non-empty error description (maximum 200 characters) and a "إعادة المحاولة" button that resets the error state and re-renders the child tree; the button SHALL be disabled after 3 consecutive retry attempts within the same session.
6. WHEN the retry limit of 3 consecutive attempts is reached, THE Error_Boundary SHALL disable the retry button and display a message instructing the user to restart the app manually.
7. IF the Error_Boundary itself throws during rendering of the fallback UI, THEN THE Error_Boundary SHALL render a static hardcoded string (no dynamic data, no interactive elements) without crashing the process.

---

### المتطلب 3: Conventional Commits + Commitlint

**User Story:** بوصفي مطوراً في الفريق، أريد أن يرفض Git تلقائياً رسائل الـ commits التي لا تتبع معيار Conventional Commits، حتى يبقى سجل التغييرات منظماً وقابلاً للأتمتة.

#### معايير القبول

1. THE Commitlint SHALL be configured via `commitlint.config.js` at the monorepo root using `@commitlint/config-conventional`.
2. WHEN a developer runs `git commit`, THE Commitlint SHALL execute automatically via the existing Husky `commit-msg` hook.
3. WHEN a commit message does not follow the pattern `<type>(<scope>): <subject>`, THE Commitlint SHALL reject the commit and print a descriptive error message listing the violation.
4. THE Commitlint SHALL accept the following types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `revert`.
5. WHEN a commit message is valid, THE Commitlint SHALL exit with code 0 and allow the commit to proceed.
6. THE Commitlint configuration SHALL be added to the existing Husky setup without removing or modifying existing hooks (`pre-commit`, `pre-push`).

---

### المتطلب 4: CODEOWNERS — تحديد ملكية الكود

**User Story:** بوصفي مسؤول المشروع، أريد ملف CODEOWNERS يُحدد تلقائياً المراجعين المطلوبين لكل Pull Request بناءً على المسار المُعدَّل، حتى لا تمر تغييرات حساسة دون مراجعة متخصصة.

#### معايير القبول

1. THE CODEOWNERS file SHALL be created at `.github/CODEOWNERS` in the monorepo root.
2. THE CODEOWNERS file SHALL assign ownership for `apps/admin/` to the admin frontend team handle.
3. THE CODEOWNERS file SHALL assign ownership for `apps/mobile/` to the mobile team handle.
4. THE CODEOWNERS file SHALL assign ownership for `supabase/` to the backend team handle.
5. THE CODEOWNERS file SHALL assign ownership for `packages/core/` to the core library team handle.
6. THE CODEOWNERS file SHALL assign ownership for `.github/workflows/` and `supabase/migrations/` to the DevOps/lead handle.
7. WHEN a Pull Request modifies files under a defined path, GitHub SHALL automatically request a review from the corresponding owner before the PR can be merged.

---

### المتطلب 5: Secure Storage — تخزين آمن للبيانات الحساسة

**User Story:** بوصفي مستخدماً للتطبيق، أريد أن تُخزَّن بيانات المصادقة وذاكرة التخزين المؤقت للاشتراك في منطقة مشفّرة بالجهاز، حتى لا يتمكن تطبيق آخر أو مهاجم من قراءتها من ذاكرة التخزين غير المشفّرة.

#### معايير القبول

1. THE SecureStore SHALL replace `AsyncStorage` as the storage backend for the `auth-storage` key in `useAuthStore` (Zustand persist middleware), storing `role` and `profile` fields.
2. THE SecureStore SHALL replace `AsyncStorage` as the storage backend for the `booking-storage` key in `useBookingStore`, storing `isBooking`, `lastBookingId`, `bookingError`, and `idempotencyKey` fields.
3. THE SecureStore SHALL replace `AsyncStorage` as the storage backend in `OfflineCache` (`offlineCache.ts`) for the `@uniride_active_subscription` key only.
4. WHEN data is written via SecureStore on a supported device, THE application SHALL successfully read back the same value in a subsequent call without data loss or corruption.
5. WHEN the device does not support SecureStore (e.g., emulator without secure hardware), THE application SHALL fall back to `AsyncStorage` for that key and emit a `logger.warn` message with the text "SecureStore unavailable, falling back to AsyncStorage" and the affected key name.
6. THE SecureStore SHALL NOT be used for the `gps_offline_queue` key — that key SHALL remain in `AsyncStorage` as it contains non-sensitive location data. The `trip-storage` and `i18n-storage` Zustand stores SHALL also remain in `AsyncStorage`.
7. WHEN a user logs out, THE application SHALL call the SecureStore delete API for the `auth-storage`, `booking-storage`, and `@uniride_active_subscription` keys as part of the existing logout flow, in addition to the Zustand `logout()` action.

---

### المتطلب 6: NetInfo — استبدال Polling بمراقبة الشبكة

**User Story:** بوصفي مستخدماً للتطبيق، أريد أن يكتشف التطبيق تغيير حالة الشبكة فورياً عبر أحداث النظام بدلاً من الاستعلام كل 30 ثانية، حتى يتوقف استهلاك البطارية والشبكة غير الضروري.

#### معايير القبول

1. THE NetInfo SHALL replace both the `setInterval` polling mechanism and the `AppState` listener in `useNetworkStatus.ts`, removing all calls to `supabase.rpc('ping')` from that hook.
2. WHEN the device network state changes (connected/disconnected), THE NetInfo event listener SHALL trigger an update to `isOnline` state within 1 second of the actual change.
3. WHEN the component mounts, THE `useNetworkStatus` hook SHALL call `NetInfo.fetch()` once to resolve the initial `isOnline` state before the first event fires, applying the same evaluation rules as criteria 5–8.
4. THE `useNetworkStatus` hook SHALL call `NetInfo.addEventListener` on mount to subscribe to network changes and call the returned unsubscribe function in the cleanup of `useEffect` on unmount.
5. WHEN `NetInfo` reports `isConnected === false`, THE `useNetworkStatus` hook SHALL set `isOnline` to `false`.
6. WHEN `NetInfo` reports `isConnected === true` and `isInternetReachable === true`, THE `useNetworkStatus` hook SHALL set `isOnline` to `true`.
7. WHEN `NetInfo` reports `isConnected === true` and `isInternetReachable === false`, THE `useNetworkStatus` hook SHALL set `isOnline` to `false`.
8. WHEN `NetInfo` reports `isInternetReachable === null` (indeterminate), THE `useNetworkStatus` hook SHALL set `isOnline` to `true` to avoid false offline fallbacks.

---

### المتطلب 7: Push Token Cleanup — حذف Tokens المنتهية الصلاحية

**User Story:** بوصفي مشغّل النظام، أريد أن تُحذف Push Tokens المنتهية الصلاحية تلقائياً من قاعدة البيانات عند فشل الإرسال، حتى لا تتراكم سجلات ميتة وتُبطئ استعلامات الإشعارات.

#### معايير القبول

1. WHEN the Expo Push API returns a response body where a token's `status === 'error'` and `details.error === 'DeviceNotRegistered'`, THE Notification_Service SHALL delete that token's row from the `push_tokens` table using the Supabase admin client.
2. WHEN a token is deleted due to `DeviceNotRegistered`, THE Notification_Service SHALL log the event with level `info`, including the `user_id` and only the first 20 characters of the token value.
3. THE Notification_Service SHALL perform token cleanup asynchronously after sending the HTTP response to the caller, so cleanup does not add latency to the push notification flow.
4. WHEN multiple tokens exist for a user and only some return `DeviceNotRegistered`, THE Notification_Service SHALL delete only the invalid tokens and leave the remaining valid tokens untouched in the `push_tokens` table.
5. IF the Supabase delete call for an invalid token fails, THEN THE Notification_Service SHALL log the error with level `error` including the failure reason, and continue processing remaining tokens without rethrowing.
6. THE Notification_Service SHALL parse the full Expo API JSON response body for each token to extract the `status` and `details` fields before deciding whether to delete the token — it SHALL NOT rely solely on HTTP status codes.

---

### المتطلب 8: HTTP Security Headers — تأمين Admin Dashboard

**User Story:** بوصفي مسؤول أمان، أريد أن يُرسل Admin Dashboard ترويسات HTTP أمنية قياسية مع كل استجابة، حتى يحمي المتصفح المستخدمين من هجمات XSS وClickjacking وتسريب المعلومات.

#### معايير القبول

1. THE Admin_Dashboard SHALL add a `Strict-Transport-Security` header with value `max-age=63072000; includeSubDomains` to all HTTP responses via `next.config.ts`.
2. THE Admin_Dashboard SHALL add an `X-Frame-Options` header with value `DENY` to all HTTP responses.
3. THE Admin_Dashboard SHALL add an `X-Content-Type-Options` header with value `nosniff` to all HTTP responses.
4. THE Admin_Dashboard SHALL add a `Referrer-Policy` header with value `strict-origin-when-cross-origin` to all HTTP responses.
5. THE Admin_Dashboard SHALL add a `Content-Security-Policy` header that allows `default-src 'self'`, permits Supabase API domain under `connect-src`, and permits MUI/Google Fonts under `style-src` and `font-src`.
6. THE Admin_Dashboard SHALL add a `Permissions-Policy` header that disables `camera`, `microphone`, and `geolocation` for the admin origin.
7. WHEN the Next.js application is built and deployed, THE Admin_Dashboard SHALL apply these headers to all routes including API routes via the `headers()` function in `next.config.ts`.

---

### المتطلب 9: Soft Delete Pattern — حذف ناعم للرحلات والاشتراكات

**User Story:** بوصفي مسؤول قاعدة البيانات، أريد إضافة عمود `deleted_at` على جداول `trips` و`subscriptions`، حتى يمكن استرداد السجلات المحذوفة وتتبع تاريخ الحذف لأغراض التدقيق.

#### معايير القبول

1. THE Migration SHALL add a nullable `deleted_at TIMESTAMPTZ DEFAULT NULL` column to the `trips` table.
2. THE Migration SHALL add a nullable `deleted_at TIMESTAMPTZ DEFAULT NULL` column to the `subscriptions` table.
3. THE Migration SHALL create a partial index `idx_trips_not_deleted` on `trips(id)` WHERE `deleted_at IS NULL` to maintain query performance for active records.
4. THE Migration SHALL create a partial index `idx_subscriptions_not_deleted` on `subscriptions(id)` WHERE `deleted_at IS NULL`.
5. WHEN a record is soft-deleted, THE application SHALL set `deleted_at` to the current UTC timestamp instead of executing a `DELETE` statement.
6. THE Migration SHALL follow the naming convention `YYYYMMDDNN_soft_delete_trips_subscriptions.sql` and be placed in `supabase/migrations/`.
7. WHEN existing RLS policies query `trips` or `subscriptions`, THE policies SHALL be updated to include `AND deleted_at IS NULL` to exclude soft-deleted records from normal reads.

---

### المتطلب 10: ADR Template — توثيق القرارات المعمارية

**User Story:** بوصفي مطوراً جديداً في الفريق، أريد مجلد `docs/adr` يحتوي على template موحّد لتوثيق القرارات المعمارية، حتى أفهم سياق القرارات السابقة وأتبع نفس الأسلوب عند توثيق قرارات جديدة.

#### معايير القبول

1. THE ADR_Template SHALL be created at `docs/adr/0000-template.md` in the monorepo root.
2. THE ADR_Template SHALL include the following sections: Title, Date, Status (Proposed/Accepted/Deprecated/Superseded), Context, Decision, Consequences, and Alternatives Considered.
3. THE ADR_Template SHALL include a `Superseded By` field that references the ADR number of the replacement decision when applicable.
4. THE ADR_Template SHALL include a README at `docs/adr/README.md` that explains the ADR process, numbering convention (`NNNN-kebab-case-title.md`), and lists existing ADRs.
5. THE ADR_Template SHALL include at least one example ADR (e.g., `0001-use-supabase-migrations-as-source-of-truth.md`) documenting an existing architectural decision in the project.
6. WHEN a new ADR is created, THE ADR SHALL be numbered sequentially and placed in `docs/adr/` following the template structure.

---

# الفئة الثانية — تحسينات متوسطة (شهر–شهرين)

---

### المتطلب 11: Sentry Integration — مراقبة الأعطال

**User Story:** بوصفي مطوراً، أريد أن تُرسَل أعطال التطبيق وأخطاء الـ admin تلقائياً إلى Sentry مع السياق الكامل، حتى أكتشف المشاكل في الإنتاج قبل أن يبلّغ عنها المستخدمون.

#### معايير القبول

1. THE Sentry SHALL be initialized in `apps/mobile` using `@sentry/react-native` with the DSN loaded from `EXPO_PUBLIC_SENTRY_DSN` environment variable.
2. THE Sentry SHALL be initialized in `apps/admin` using `@sentry/nextjs` with the DSN loaded from `NEXT_PUBLIC_SENTRY_DSN` environment variable.
3. WHEN an unhandled JavaScript error occurs in `apps/mobile`, THE Sentry SHALL capture the error with the device platform, app version, and user ID (if authenticated) as context tags.
4. WHEN an unhandled error occurs in `apps/admin`, THE Sentry SHALL capture the error with the Next.js route, user role, and timestamp as context.
5. THE Sentry SHALL be configured with `environment` set to `production` or `development` based on the build configuration.
6. WHEN `__DEV__` is `true` in `apps/mobile`, THE Sentry SHALL operate in debug mode and log events to the console instead of sending them to the remote DSN.
7. THE existing `logger.error` in `apps/mobile/src/lib/logger.ts` SHALL call `Sentry.captureException` in addition to the existing `reportError` fetch call.
8. WHEN Sentry is not configured (DSN is absent), THE application SHALL start normally without throwing an initialization error.

---

### المتطلب 12: OpenTelemetry — Distributed Tracing للـ Edge Functions

**User Story:** بوصفي مهندس بنية تحتية، أريد أن تُصدر Edge Functions بيانات tracing موزّعة بمعيار OpenTelemetry، حتى أتتبع مسار الطلب الكامل من المستخدم إلى قاعدة البيانات وأحدد نقاط الاختناق.

#### معايير القبول

1. THE OpenTelemetry SDK SHALL be integrated into `supabase/functions/trip-engine/index.ts` and `supabase/functions/send-notification/index.ts` as the highest-priority Edge Functions.
2. WHEN a request is received by an instrumented Edge Function, THE OpenTelemetry SDK SHALL create a root span with the function name, HTTP method, and request path as attributes.
3. WHEN the Edge Function calls Supabase RPC or database operations, THE OpenTelemetry SDK SHALL create child spans for each database call with the operation name and duration.
4. THE OpenTelemetry SDK SHALL export traces to an OTLP-compatible endpoint configured via `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable.
5. WHEN `OTEL_EXPORTER_OTLP_ENDPOINT` is not set, THE OpenTelemetry SDK SHALL operate in no-op mode without throwing errors or impacting function performance.
6. THE OpenTelemetry SDK SHALL propagate `traceparent` headers from incoming requests to enable end-to-end trace correlation across services.
7. WHEN a span ends with an error, THE OpenTelemetry SDK SHALL record the error message and set the span status to `ERROR`.

---

### المتطلب 13: Exponential Backoff with Jitter — Utility مشتركة

**User Story:** بوصفي مطوراً، أريد دالة `retryWithBackoff` مشتركة في `packages/core` تُنفّذ إعادة المحاولة بتأخير أسي مع jitter عشوائي، حتى لا تُكرر كل وحدة كتابة منطق retry خاص بها وتتجنب thundering herd عند فشل الخدمة.

#### معايير القبول

1. THE Backoff_Utility SHALL be exported from `packages/core/index.ts` with the signature `retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>`, where `RetryOptions` is also exported as a named type.
2. THE Backoff_Utility SHALL accept the following options with defaults: `maxRetries: number = 3`, `baseDelayMs: number = 500`, `maxDelayMs: number = 30000`, `shouldRetry: (error: unknown) => boolean = () => true`.
3. WHEN an attempt fails and the retry count has not reached `maxRetries`, THE Backoff_Utility SHALL wait for `Math.min(baseDelayMs * Math.pow(2, attempt) + jitter, maxDelayMs)` milliseconds before the next attempt, where `jitter` is a uniformly random integer in `[0, baseDelayMs)` and `attempt` is 0-indexed.
4. WHEN all `maxRetries` attempts are exhausted without success, THE Backoff_Utility SHALL throw the error from the last failed attempt — not a wrapper error.
5. WHEN `shouldRetry(error)` returns `false` for a given error, THE Backoff_Utility SHALL immediately throw that error without scheduling any further retry delay.
6. WHEN the wrapped function `fn` succeeds on attempt N where N ≤ maxRetries, THE Backoff_Utility SHALL return the resolved value of `fn` without further retries.
7. THE Backoff_Utility SHALL NOT import or depend on any React, Expo, or Supabase modules — it must be usable in both Deno (Edge Functions) and Node/React Native environments.
8. FOR ALL inputs where `fn` fails exactly N times (N ≤ maxRetries) then succeeds, `retryWithBackoff(fn, { maxRetries })` SHALL resolve with the success value — this is the primary property-based test invariant.

---

### المتطلب 14: Offline Data Encryption — تشفير Cache الاشتراك

**User Story:** بوصفي مستخدماً للتطبيق، أريد أن يُشفَّر cache الاشتراك المحلي بمفتاح مرتبط بالجهاز، حتى لا يتمكن أحد من تعديل بيانات الاشتراك المخزّنة محلياً لتجاوز التحقق من الصلاحية.

#### معايير القبول

1. THE SecureStore SHALL store the active subscription cache in `offlineCache.ts` using `expo-secure-store` with `keychainAccessible: SecureStore.WHEN_UNLOCKED`.
2. WHEN `OfflineCache.saveActiveSubscription` is called, THE SecureStore SHALL serialize the subscription payload to JSON and store it via `SecureStore.setItemAsync`.
3. WHEN `OfflineCache.getActiveSubscription` is called, THE SecureStore SHALL retrieve and deserialize the payload via `SecureStore.getItemAsync`.
4. WHEN the stored value cannot be parsed as valid JSON, THE SecureStore SHALL delete the corrupted entry and return `null`.
5. THE SecureStore SHALL enforce a maximum payload size of 2048 bytes for the subscription cache; IF the serialized payload exceeds this limit, THEN THE SecureStore SHALL log a warning and skip caching.
6. WHEN a user logs out, THE SecureStore SHALL call `SecureStore.deleteItemAsync` for the subscription cache key as part of `OfflineCache.clear()`.
7. THE existing expiry check (comparing `end_date` to current date) SHALL be preserved after migrating to SecureStore.

---

### المتطلب 15: Contract Testing (Pact) — توافق Mobile وEdge Functions

**User Story:** بوصفي مطوراً، أريد اختبارات Contract Testing بين `apps/mobile` وEdge Functions، حتى يكتشف CI أي كسر في عقد الـ API قبل النشر بدلاً من اكتشافه في الإنتاج.

#### معايير القبول

1. THE Pact SHALL define consumer contracts in `apps/mobile` for the following Edge Functions: `trip-engine`, `send-notification`, and `zaincash-webhook`.
2. WHEN the mobile app calls `trip-engine` with a valid `TripUpdateRequest`, THE Pact consumer test SHALL verify that the request body matches the Zod schema defined in `packages/core`.
3. WHEN the mobile app calls `send-notification`, THE Pact consumer test SHALL verify that the request includes `targetUserId`, `title`, and `body` fields with correct types.
4. THE Pact provider tests SHALL run against the actual Edge Function handlers (not deployed) to verify they satisfy the consumer contracts.
5. WHEN a contract is violated (e.g., a required field is removed from the Edge Function response), THE Pact provider test SHALL fail with a descriptive message identifying the broken interaction.
6. THE Pact contract files (`.json` pact files) SHALL be stored in `packages/core/pacts/` and committed to the repository.
7. THE Pact tests SHALL be integrated into the CI pipeline (`ci.yml`) and run after unit tests.

---

### المتطلب 16: Load Testing (k6) — اختبار الأداء تحت الضغط

**User Story:** بوصفي مهندس أداء، أريد سيناريوهات k6 تختبر `trip-engine` و`activate_license` تحت حمل واقعي، حتى أعرف الحد الأقصى للطلبات قبل تدهور الأداء وأحدد نقاط الاختناق.

#### معايير القبول

1. THE k6 load test for `trip-engine` SHALL simulate 50 concurrent virtual users sending `POST /functions/v1/trip-engine` requests for 60 seconds.
2. THE k6 load test for `activate_license` SHALL simulate 20 concurrent virtual users calling `supabase.rpc('activate_license')` for 60 seconds with unique license codes per iteration.
3. WHEN the `trip-engine` load test runs, THE k6 test SHALL assert that 95th percentile response time is below 500ms.
4. WHEN the `activate_license` load test runs, THE k6 test SHALL assert that the error rate is below 1% excluding expected `rate_limit_exceeded` errors.
5. THE k6 test scripts SHALL be placed in `tests/load/trip-engine.js` and `tests/load/activate-license.js`.
6. THE k6 test scripts SHALL read the target URL and authentication token from environment variables `K6_BASE_URL` and `K6_SERVICE_ROLE_KEY`.
7. WHEN a load test completes, THE k6 test SHALL output a summary report including p50, p95, p99 response times and total request count.

---

### المتطلب 17: Semantic Versioning + Changelog — أتمتة الإصدارات

**User Story:** بوصفي مسؤول الإصدارات، أريد أن تُولَّد أرقام الإصدارات وملف CHANGELOG.md تلقائياً من رسائل Conventional Commits عند الدمج في `main`، حتى لا يحتاج الفريق لتحديث الإصدار يدوياً.

#### معايير القبول

1. THE Semantic_Release SHALL be configured at the monorepo root via `.releaserc.json` using `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/changelog`, and `@semantic-release/git`.
2. WHEN commits of type `feat` are merged to `main`, THE Semantic_Release SHALL increment the minor version number.
3. WHEN commits of type `fix` or `perf` are merged to `main`, THE Semantic_Release SHALL increment the patch version number.
4. WHEN a commit footer contains `BREAKING CHANGE:`, THE Semantic_Release SHALL increment the major version number.
5. WHEN a new version is determined, THE Semantic_Release SHALL update `CHANGELOG.md` at the monorepo root with a dated section listing all changes since the last release.
6. WHEN a new version is released, THE Semantic_Release SHALL create a Git tag in the format `v{major}.{minor}.{patch}` and push it to the remote repository.
7. THE Semantic_Release workflow SHALL run only on pushes to the `main` branch via a dedicated GitHub Actions workflow file `.github/workflows/release.yml`.
8. WHEN no releasable commits exist since the last tag, THE Semantic_Release SHALL exit without creating a new release or modifying any files.

---

### المتطلب 18: Webhook Signature Verification (HMAC) — تأمين ZainCash Webhook

**User Story:** بوصفي مطوراً للأمان، أريد أن يتحقق `zaincash-webhook` من توقيع HMAC لكل طلب وارد، حتى يرفض الطلبات المزوّرة التي لا تأتي من ZainCash الفعلي.

#### معايير القبول

1. WHEN `zaincash-webhook` receives a POST request, THE HMAC_Verifier SHALL extract the `X-ZainCash-Signature` header from the request.
2. WHEN the signature header is present, THE HMAC_Verifier SHALL compute `HMAC-SHA256(requestBody, ZAINCASH_SECRET)` and compare it to the provided signature using a constant-time comparison to prevent timing attacks.
3. IF the computed signature does not match the provided signature, THEN THE HMAC_Verifier SHALL return HTTP 401 with body `{"error": "Invalid signature"}` without processing the payload.
4. IF the `X-ZainCash-Signature` header is absent, THEN THE HMAC_Verifier SHALL return HTTP 400 with body `{"error": "Missing signature"}`.
5. WHEN `ZAINCASH_SECRET` is not configured in environment variables, THE HMAC_Verifier SHALL log a warning and return HTTP 503 with body `{"error": "Webhook not configured"}`.
6. WHEN signature verification succeeds, THE HMAC_Verifier SHALL pass control to the existing payment processing logic.
7. THE HMAC_Verifier SHALL log all verification failures using `log('warn', ...)` with the request IP and a truncated signature prefix (first 8 characters) for audit purposes.

---

### المتطلب 19: Optimistic UI Updates — تحديثات فورية للواجهة

**User Story:** بوصفي مستخدماً للتطبيق، أريد أن تنعكس تغييرات حالة الرحلة والاشتراك فوراً في الواجهة دون انتظار استجابة الخادم، حتى يبدو التطبيق سريعاً حتى على شبكات بطيئة.

#### معايير القبول

1. WHEN a driver triggers a trip status transition (e.g., `scheduled → driver_waiting`), THE `useDriverTrips` hook SHALL update the local `trips` state optimistically before the server confirms the change.
2. WHEN a student cancels a subscription, THE `useSubscriptions` hook SHALL update the local subscription status to `cancelled` optimistically before the `cancel_subscription` RPC responds.
3. WHEN the server confirms the optimistic update, THE hook SHALL replace the optimistic state with a full re-fetch of the resource from the server — it SHALL NOT merge `payload.new` directly into local state (per AGENTS.md §10).
4. WHEN the server returns an error after an optimistic update, THE hook SHALL revert the local state to the exact snapshot captured immediately before the optimistic update was applied, and set an error message.
5. WHEN an optimistic update is in progress, THE hook SHALL expose an `isPending: boolean` flag that is `true` from the moment the optimistic state is applied until the server responds (success or error).
6. WHEN `canTransition(currentStatus, newStatus)` from `packages/core` returns `false`, THE hook SHALL NOT apply any optimistic state change, SHALL keep `isPending` as `false`, and SHALL set an error message indicating an invalid transition.
7. WHEN a Realtime channel event is received while `isPending === true`, THE hook SHALL discard the optimistic state and apply the server-confirmed value from the Realtime event.
8. WHEN the server has not responded within 30 seconds of an optimistic update, THE hook SHALL revert to the pre-optimistic snapshot, set `isPending` to `false`, and set an error message indicating a timeout.

---

### المتطلب 20: pg_stat_statements — مراقبة أداء الاستعلامات

**User Story:** بوصفي مسؤول قاعدة البيانات، أريد تفعيل `pg_stat_statements` وإضافة dashboard لمراقبة أبطأ الاستعلامات، حتى أكتشف الاستعلامات التي تحتاج فهرسة أو تحسيناً قبل أن تؤثر على المستخدمين.

#### معايير القبول

1. THE Migration SHALL enable the `pg_stat_statements` extension via `CREATE EXTENSION IF NOT EXISTS pg_stat_statements` in a new migration file.
2. THE Migration SHALL create a view `public.slow_queries` that queries `pg_stat_statements` and returns the top 20 queries ordered by `mean_exec_time DESC`, exposing columns: `query`, `calls`, `mean_exec_time`, `total_exec_time`, `rows`.
3. THE Migration SHALL grant `SELECT` on `public.slow_queries` to the `authenticated` role so the admin dashboard can query it via the Supabase client.
4. WHEN the admin dashboard queries `slow_queries`, THE Admin_Dashboard SHALL display the results in a sortable table in `apps/admin/src/app/analytics/page.tsx` under a "Query Performance" section.
5. THE Admin_Dashboard SHALL display `mean_exec_time` in milliseconds rounded to 2 decimal places.
6. THE Migration SHALL follow the naming convention `YYYYMMDDNN_pg_stat_statements.sql` and be placed in `supabase/migrations/`.
7. WHEN `pg_stat_statements` is not available (e.g., local dev without the extension), THE Admin_Dashboard query SHALL fail gracefully and display a "Query monitoring not available" message instead of crashing.
