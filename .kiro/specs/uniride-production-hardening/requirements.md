# Requirements Document

## Introduction

UniRide v2 is a university transport platform for Iraq, built as a pnpm monorepo with three primary workspaces: `apps/admin` (Next.js 16 + Refine + MUI), `apps/mobile` (Expo 54 + React Native), and `packages/core` (Zod schemas, i18n, state machine), backed by Supabase Edge Functions (Deno) and SQL migrations.

This spec defines the production-readiness hardening requirements across 25 improvements organized into two categories: Category 1 (easy and free, targeting 1–2 weeks) and Category 2 (medium complexity, free or low-cost, targeting 4–6 weeks). The improvements span crash resilience, security, observability, developer experience, data integrity, and performance.

All requirements must respect the constraints in `AGENTS.md`: roles are read from `app_metadata` only, database changes use Supabase migrations only (no Drizzle), `console.log` is forbidden (use `logger.warn`/`logger.error`), `pageSize: 0` is forbidden, Realtime channels must handle `CHANNEL_ERROR`/`TIMED_OUT` with re-fetch, the GPS queue uses AsyncStorage key `gps_offline_queue`, and state machine transitions are defined in `packages/core/index.ts`.

---

## Glossary

- **Admin_App**: The Next.js 16 + Refine + MUI application in `apps/admin/`.
- **Mobile_App**: The Expo 54 + React Native application in `apps/mobile/`.
- **Core_Package**: The shared package in `packages/core/index.ts` containing Zod schemas, i18n translations, and the trip state machine.
- **Edge_Function**: A Deno-based serverless function deployed to Supabase under `supabase/functions/`.
- **Migration**: A SQL file in `supabase/migrations/` following the naming pattern `YYYYMMDDNN_description.sql`.
- **Error_Boundary**: A React class component that catches unhandled JavaScript errors in its child component tree and renders a fallback UI.
- **NetInfo**: The `@react-native-community/netinfo` library providing native network connectivity events for React Native.
- **Push_Token**: An Expo push notification token stored in the `push_tokens` table, used to deliver notifications to a specific device.
- **Secure_Store**: The `expo-secure-store` library providing hardware-backed encrypted key-value storage on iOS and Android.
- **Commitlint**: A tool that validates commit messages against a configured convention (Conventional Commits).
- **Soft_Delete**: A database pattern where rows are marked as deleted via a `deleted_at` timestamp column rather than being physically removed.
- **CODEOWNERS**: A GitHub file that maps file paths to responsible code owners for automatic review assignment.
- **ADR**: Architecture Decision Record — a short document capturing a significant architectural decision, its context, and its consequences.
- **Sentry**: A third-party error monitoring and crash reporting service with a free tier.
- **OpenTelemetry**: A vendor-neutral observability framework for generating structured traces, metrics, and logs.
- **Backoff_Utility**: A function that computes retry delays using exponential backoff with random jitter to avoid thundering-herd problems.
- **Pact**: A consumer-driven contract testing framework that verifies API compatibility between consumers and providers.
- **k6**: An open-source load testing tool for HTTP-based services.
- **Semantic_Release**: An automated versioning and changelog tool driven by Conventional Commits.
- **HMAC**: Hash-based Message Authentication Code — a cryptographic signature used to verify webhook payload authenticity.
- **Optimistic_Update**: A UI pattern where the local state is updated immediately before the server confirms the operation, with rollback on failure.
- **pg_stat_statements**: A PostgreSQL extension that tracks execution statistics for all SQL statements.
- **SWR_Pattern**: Stale-While-Revalidate — a caching strategy that returns cached data immediately while fetching a fresh version in the background.
- **OpenAPI**: A standard specification format (YAML/JSON) for describing REST APIs.
- **Runbook**: An operational document describing how to diagnose and resolve known failure scenarios.
- **Input_Sanitizer**: A module that strips or rejects dangerous characters and oversized payloads from untrusted input before processing.
- **Zaincash_Webhook**: The Edge Function at `supabase/functions/zaincash-webhook/index.ts` that receives payment confirmation callbacks from ZainCash.
- **GPS_Queue**: The offline location update queue stored in AsyncStorage under the key `gps_offline_queue`, managed by `useLocationTracker` in `apps/mobile/src/hooks/useTrips.ts`.
- **Feature_Flags_Store**: A Zustand store slice that holds the feature flags map, replacing the current module-level `cachedFlags` variable in `useFeatureFlags.ts`.
- **CSP**: Content Security Policy — an HTTP response header that restricts which resources a browser may load.
- **HSTS**: HTTP Strict Transport Security — an HTTP response header that forces browsers to use HTTPS.

---

## Requirements

---

### Requirement 1: Error Boundary Component (Mobile App)

**User Story:** As a student or driver using the mobile app, I want unhandled JavaScript errors to be caught gracefully, so that the app displays a recovery screen instead of crashing silently.

#### Acceptance Criteria

1. THE Mobile_App SHALL provide an `ErrorBoundary` React class component in `apps/mobile/src/components/ErrorBoundary.tsx` that wraps the root navigator.
2. WHEN an unhandled JavaScript error is thrown inside the `ErrorBoundary` subtree, THE Mobile_App SHALL render a fallback UI containing a user-visible error message and a "Retry" button, without crashing the entire application.
3. WHEN the "Retry" button is pressed, THE Mobile_App SHALL reset the error state and re-render the wrapped subtree.
4. WHEN an error is caught by the `ErrorBoundary`, THE Mobile_App SHALL call `logger.error` with the error message and component stack, and SHALL NOT call `console.log`.
5. WHERE Sentry integration is enabled (Requirement 13), THE `ErrorBoundary` SHALL forward the caught error to Sentry before rendering the fallback UI.

---

### Requirement 2: Strict TypeScript Configuration

**User Story:** As a developer, I want stricter TypeScript compiler options enabled across the monorepo, so that index-access bugs and optional-property mismatches are caught at compile time rather than at runtime.

#### Acceptance Criteria

1. THE Core_Package `tsconfig.json` SHALL set `"noUncheckedIndexedAccess": true` and `"exactOptionalPropertyTypes": true` under `compilerOptions`.
2. THE Admin_App `tsconfig.json` SHALL set `"noUncheckedIndexedAccess": true` and `"exactOptionalPropertyTypes": true` under `compilerOptions`.
3. THE Mobile_App `tsconfig.json` SHALL set `"noUncheckedIndexedAccess": true` and `"exactOptionalPropertyTypes": true` under `compilerOptions`.
4. WHEN `pnpm typecheck` is executed after enabling the strict options, THE build system SHALL report zero new type errors introduced by these flags (all pre-existing violations SHALL be resolved before the flags are committed).
5. THE root `tsconfig.base.json` (if present) SHALL define the strict options so that all workspace packages inherit them without duplication.

---

### Requirement 3: HTTP Security Headers (Admin App)

**User Story:** As a security engineer, I want the admin Next.js app to send hardened HTTP response headers, so that common browser-based attacks such as clickjacking, MIME sniffing, and cross-site scripting are mitigated.

#### Acceptance Criteria

1. THE Admin_App `next.config.ts` SHALL configure a `headers()` function that applies the following headers to all routes matching `/(.*)`
2. WHEN a browser requests any Admin_App page, THE Admin_App SHALL respond with `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
3. WHEN a browser requests any Admin_App page, THE Admin_App SHALL respond with `X-Frame-Options: DENY`.
4. WHEN a browser requests any Admin_App page, THE Admin_App SHALL respond with `X-Content-Type-Options: nosniff`.
5. WHEN a browser requests any Admin_App page, THE Admin_App SHALL respond with a `Content-Security-Policy` header that allows scripts from `'self'` and the Supabase project domain, blocks inline scripts by default, and includes `upgrade-insecure-requests`.
6. WHEN a browser requests any Admin_App page, THE Admin_App SHALL respond with `Referrer-Policy: strict-origin-when-cross-origin`.
7. WHEN a browser requests any Admin_App page, THE Admin_App SHALL respond with `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

---

### Requirement 4: Replace Polling with NetInfo in useNetworkStatus

**User Story:** As a mobile user, I want the app to detect network connectivity changes instantly using native OS events, so that the offline/online transition is immediate and the app does not waste battery on a 30-second polling interval.

#### Acceptance Criteria

1. THE Mobile_App SHALL add `@react-native-community/netinfo` as a dependency in `apps/mobile/package.json`.
2. WHEN the device network state changes, THE `useNetworkStatus` hook SHALL update `isOnline` within 1 second of the OS-level connectivity event by subscribing to `NetInfo.addEventListener`.
3. THE `useNetworkStatus` hook SHALL remove the `setInterval` polling call and the `AppState` change listener that currently trigger `supabase.rpc('ping')` on a 30-second cycle.
4. WHEN the NetInfo event reports `isConnected === true`, THE `useNetworkStatus` hook SHALL set `isOnline` to `true`.
5. WHEN the NetInfo event reports `isConnected === false` or `isConnected === null`, THE `useNetworkStatus` hook SHALL set `isOnline` to `false`.
6. WHEN the `useNetworkStatus` hook unmounts, THE Mobile_App SHALL unsubscribe the NetInfo listener to prevent memory leaks.
7. THE `useNetworkStatus` hook SHALL call `NetInfo.fetch()` once on mount to set the initial `isOnline` value before the first event fires.

---

### Requirement 5: Push Token Lifecycle Management

**User Story:** As a system operator, I want invalid and expired Expo push tokens to be cleaned up automatically, so that the `send-notification` Edge Function does not waste retries on dead tokens and notification delivery rates remain accurate.

#### Acceptance Criteria

1. WHEN the `send-notification` Edge Function receives a response from the Expo Push API for a given token, THE Edge_Function SHALL inspect the response body for `details.error` values of `"DeviceNotRegistered"` or `"InvalidCredentials"`.
2. WHEN the Expo Push API response contains `details.error === "DeviceNotRegistered"` for a token, THE Edge_Function SHALL delete that token's row from the `push_tokens` table using the Supabase admin client.
3. WHEN the Expo Push API response contains `details.error === "InvalidCredentials"` for a token, THE Edge_Function SHALL delete that token's row from the `push_tokens` table using the Supabase admin client.
4. WHEN a token is deleted due to an invalid response, THE Edge_Function SHALL call `logger.warn` with the token identifier (not the full token value) and the error reason, and SHALL NOT call `console.log`.
5. THE Edge_Function SHALL continue processing remaining tokens for the same user after deleting an invalid token, and SHALL NOT abort the entire notification batch.
6. THE `send-notification` response payload SHALL include a `cleaned` count field reporting how many tokens were removed during the request.

---

### Requirement 6: Offline Data Encryption with expo-secure-store

**User Story:** As a security engineer, I want sensitive subscription data cached for offline use to be stored in hardware-backed encrypted storage, so that a rooted or jailbroken device cannot read the subscription payload from unencrypted AsyncStorage.

#### Acceptance Criteria

1. THE Mobile_App SHALL add `expo-secure-store` as a dependency in `apps/mobile/package.json`.
2. THE `OfflineCache` module in `apps/mobile/src/lib/offlineCache.ts` SHALL replace all `AsyncStorage.setItem` and `AsyncStorage.getItem` calls for the key `@uniride_active_subscription` with `SecureStore.setItemAsync` and `SecureStore.getItemAsync` respectively.
3. WHEN `SecureStore.setItemAsync` is called with a subscription payload, THE Mobile_App SHALL serialize the payload as a JSON string before storing it.
4. WHEN `SecureStore.getItemAsync` returns a non-null string, THE Mobile_App SHALL parse it as JSON to reconstruct the subscription object.
5. IF `SecureStore.setItemAsync` or `SecureStore.getItemAsync` throws an error, THEN THE `OfflineCache` module SHALL call `logger.warn` with the error message and SHALL return `null` for reads or silently skip for writes, maintaining the same error-handling contract as the current implementation.
6. WHEN `OfflineCache.clear()` is called, THE Mobile_App SHALL call `SecureStore.deleteItemAsync` for the subscription key.
7. THE `OfflineCache` module SHALL NOT store the GPS queue (`gps_offline_queue`) in SecureStore — that key SHALL remain in AsyncStorage as it is not sensitive subscription data.

---

### Requirement 7: Conventional Commits + Commitlint

**User Story:** As a developer, I want every commit message to be validated against the Conventional Commits specification, so that automated changelog generation and semantic versioning tooling can parse the git history reliably.

#### Acceptance Criteria

1. THE monorepo SHALL add `@commitlint/cli` and `@commitlint/config-conventional` as dev dependencies in the root `package.json`.
2. THE monorepo root SHALL contain a `commitlint.config.js` (or `commitlint.config.cjs`) file that extends `@commitlint/config-conventional`.
3. THE existing Husky configuration in `.husky/` SHALL add a `commit-msg` hook that runs `npx --no -- commitlint --edit "$1"`.
4. WHEN a developer commits with a message that does not follow the pattern `<type>(<scope>): <description>`, THE Commitlint hook SHALL exit with a non-zero code and print a descriptive error message listing the allowed types.
5. WHEN a developer commits with a valid Conventional Commits message, THE Commitlint hook SHALL exit with code 0 and allow the commit to proceed.
6. THE allowed commit types SHALL include at minimum: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `build`, `revert`.

---

### Requirement 8: Soft Delete Pattern for Subscriptions and Trips

**User Story:** As a system operator, I want deleted subscriptions and trips to be retained in the database with a `deleted_at` timestamp, so that audit trails are preserved and accidental deletions can be recovered without restoring from backup.

#### Acceptance Criteria

1. THE database SHALL have a Migration file named `2026MMDDNN_soft_delete.sql` (following the `YYYYMMDDNN_description.sql` pattern) that adds a `deleted_at TIMESTAMPTZ DEFAULT NULL` column to the `subscriptions` table.
2. THE Migration SHALL add a `deleted_at TIMESTAMPTZ DEFAULT NULL` column to the `trips` table.
3. THE Migration SHALL create a partial index `idx_subscriptions_active` on `subscriptions(student_id)` WHERE `deleted_at IS NULL`.
4. THE Migration SHALL create a partial index `idx_trips_active` on `trips(driver_id)` WHERE `deleted_at IS NULL`.
5. THE Migration SHALL update the Row Level Security policies on `subscriptions` and `trips` to add `AND deleted_at IS NULL` to all SELECT policies, so that soft-deleted rows are invisible to regular queries.
6. WHEN a subscription is cancelled via `cancel_subscription()` RPC, THE database SHALL set `deleted_at = NOW()` on the subscription row rather than physically deleting it.
7. THE Admin_App queries for subscriptions and trips SHALL filter by `deleted_at IS NULL` by default, and SHALL NOT expose soft-deleted rows in standard list views.
8. IF an admin needs to view soft-deleted records, THEN THE Admin_App SHALL provide a separate query path (e.g., a "Show deleted" toggle) that explicitly includes `deleted_at IS NOT NULL` rows.

---

### Requirement 9: CODEOWNERS File

**User Story:** As a team lead, I want a CODEOWNERS file in the repository, so that GitHub automatically requests reviews from the correct owners when pull requests touch specific parts of the codebase.

#### Acceptance Criteria

1. THE monorepo SHALL contain a `.github/CODEOWNERS` file.
2. THE `CODEOWNERS` file SHALL define ownership rules for at minimum the following path patterns: `apps/admin/`, `apps/mobile/`, `packages/core/`, `supabase/migrations/`, `supabase/functions/`, `.github/workflows/`, and the root configuration files (`package.json`, `pnpm-workspace.yaml`, `turbo.json`).
3. WHEN a pull request modifies files under `supabase/migrations/`, THE CODEOWNERS rule SHALL require review from the database owner team or individual.
4. WHEN a pull request modifies files under `.github/workflows/`, THE CODEOWNERS rule SHALL require review from the DevOps or platform owner.
5. THE `CODEOWNERS` file SHALL use the `@org/team` or `@username` GitHub handle format for all owner entries.

---

### Requirement 10: ADR Template and Initial Entries

**User Story:** As a developer joining the project, I want Architecture Decision Records to be available in the repository, so that I can understand why key technical choices were made without having to ask the original authors.

#### Acceptance Criteria

1. THE monorepo SHALL contain a `docs/adr/` directory with a `0000-template.md` file following the MADR (Markdown Architectural Decision Records) format, including sections: Title, Status, Context, Decision, and Consequences.
2. THE `docs/adr/` directory SHALL contain an initial ADR `0001-supabase-migrations-as-source-of-truth.md` documenting the decision to use Supabase migrations exclusively and reject Drizzle.
3. THE `docs/adr/` directory SHALL contain an ADR `0002-app-metadata-for-roles.md` documenting the decision to read roles from `app_metadata` and never from `user_metadata`.
4. THE `docs/adr/` directory SHALL contain an ADR `0003-license-based-booking.md` documenting the decision to use pre-paid license codes instead of direct seat reservation.
5. THE `docs/adr/` directory SHALL contain an ADR `0004-db-backed-rate-limiting.md` documenting the decision to use the `rate_limits` table instead of in-memory `Map()` for rate limiting in Edge Functions.
6. EACH ADR file SHALL have a Status field set to one of: `Proposed`, `Accepted`, `Deprecated`, or `Superseded`.

---

### Requirement 11: Fix Migration Naming Inconsistency

**User Story:** As a database engineer, I want migration file names to follow a consistent numbering scheme, so that the migration order is unambiguous and tooling can sort them correctly.

#### Acceptance Criteria

1. THE monorepo SHALL contain a Migration file that renames or documents the gap between `2026051005_critical_fixes.sql` (sequence `05`) and `2026051106_fix_rate_limit_and_trip_engine.sql` (sequence `106`).
2. THE new Migration naming convention SHALL use a two-digit daily sequence suffix (01–99) as defined in `AGENTS.md` pattern `YYYYMMDDNN_description.sql`, where `NN` is zero-padded to two digits.
3. ALL future Migration files created as part of this spec SHALL follow the `YYYYMMDDNN_description.sql` pattern with a two-digit `NN` suffix.
4. THE `AGENTS.md` file SHALL be updated to explicitly document that the jump from `05` to `106` was intentional (or corrected) and that all future migrations use two-digit suffixes.
5. IF the gap was unintentional, THEN THE team SHALL create a placeholder migration `2026051006_sequence_correction.sql` that contains only a comment explaining the renumbering, so that the migration history is self-documenting.

---

### Requirement 12: Feature Flags Cache in Zustand Store

**User Story:** As a developer, I want the feature flags cache to live in a Zustand store instead of a module-level variable, so that the cache is properly scoped to the user session, survives hot reloads correctly, and can be inspected with Zustand devtools.

#### Acceptance Criteria

1. THE Mobile_App SHALL add a `featureFlags` slice to the Zustand store in `apps/mobile/src/hooks/useStore.ts` with state shape `{ flags: Record<string, boolean>; setFlags: (flags: Record<string, boolean>) => void; clearFlags: () => void }`.
2. THE `useFeatureFlags` hook in `apps/mobile/src/hooks/useFeatureFlags.ts` SHALL read and write the flags map through the `featureFlags` Zustand store slice instead of the module-level `let cachedFlags` variable.
3. THE module-level `let cachedFlags: Record<string, boolean> | null = null` variable SHALL be removed from `useFeatureFlags.ts`.
4. THE exported `clearFeatureFlagsCache()` function SHALL be replaced by calling `useFeatureFlagsStore.getState().clearFlags()` directly, or by dispatching the `clearFlags` action from the logout flow.
5. WHEN a user logs out, THE Mobile_App SHALL call `clearFlags()` on the feature flags store slice so that the next user session starts with default flags.
6. THE `featureFlags` Zustand store slice SHALL NOT persist to AsyncStorage, because feature flags are fetched fresh on each session start.

---

### Requirement 13: Sentry Integration

**User Story:** As a system operator, I want crash reports and unhandled errors from both the mobile app and the admin dashboard to be captured in Sentry, so that I can diagnose production issues without waiting for user reports.

#### Acceptance Criteria

1. THE Mobile_App SHALL add `@sentry/react-native` as a dependency and initialize Sentry in `apps/mobile/app/_layout.tsx` using the DSN from the environment variable `EXPO_PUBLIC_SENTRY_DSN`.
2. THE Admin_App SHALL add `@sentry/nextjs` as a dependency and configure it via `sentry.client.config.ts` and `sentry.server.config.ts` using the DSN from the environment variable `NEXT_PUBLIC_SENTRY_DSN`.
3. WHEN an unhandled exception occurs in the Mobile_App, THE Mobile_App SHALL capture the exception in Sentry with the current user ID (from `useAuthStore`) attached as a Sentry user context, and SHALL NOT include the user's email or full name in the Sentry payload.
4. WHEN an unhandled exception occurs in the Admin_App, THE Admin_App SHALL capture the exception in Sentry with the admin user ID attached as Sentry user context.
5. THE Sentry initialization in both apps SHALL set `tracesSampleRate` to `0.1` (10%) in production and `1.0` (100%) in development to control performance monitoring costs.
6. THE `ErrorBoundary` component (Requirement 1) SHALL call `Sentry.captureException` before rendering the fallback UI.
7. WHEN Sentry is initialized, THE Mobile_App SHALL call `logger.info` confirming Sentry is active, and SHALL NOT call `console.log`.
8. THE `.env.example` file SHALL be updated to include `EXPO_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` as documented placeholder variables.

---

### Requirement 14: OpenTelemetry Structured Tracing for Edge Functions

**User Story:** As a system operator, I want structured trace spans emitted from Edge Functions, so that I can observe request latency, identify slow database queries, and correlate errors across the `trip-engine` and `send-notification` functions.

#### Acceptance Criteria

1. THE `trip-engine` Edge_Function SHALL emit an OpenTelemetry trace span for each incoming request, with attributes: `http.method`, `http.route`, `user.id`, `trip.id`, and `trip.new_status`.
2. THE `send-notification` Edge_Function SHALL emit an OpenTelemetry trace span for each incoming request, with attributes: `http.method`, `user.id`, `target_user.id`, and `notification.tokens_count`.
3. WHEN a Supabase RPC call is made inside an Edge_Function, THE Edge_Function SHALL create a child span named after the RPC function (e.g., `rpc.update_trip_status`) with the duration of the call recorded.
4. WHEN an Edge_Function returns a 4xx or 5xx response, THE trace span SHALL set `otel.status_code` to `ERROR` and record the error message.
5. THE OpenTelemetry exporter SHALL be configured via the environment variable `OTEL_EXPORTER_OTLP_ENDPOINT`, defaulting to a no-op exporter when the variable is absent, so that local development is unaffected.
6. THE tracing implementation SHALL use the `@opentelemetry/api` package compatible with Deno's ESM import system via `esm.sh`.
7. THE tracing code SHALL be extracted into a shared helper at `supabase/functions/_shared/tracing.ts` so that both Edge Functions import from the same module.

---

### Requirement 15: Exponential Backoff with Jitter Utility

**User Story:** As a developer, I want a shared exponential backoff utility available across the codebase, so that retry logic in the GPS queue flush and the `send-notification` function uses jitter to avoid thundering-herd problems instead of fixed delays.

#### Acceptance Criteria

1. THE Core_Package SHALL export a `backoffWithJitter(attempt: number, baseMs?: number, maxMs?: number): number` function from `packages/core/index.ts` that returns a delay in milliseconds computed as `min(baseMs * 2^attempt + random(0, baseMs), maxMs)`.
2. THE default value for `baseMs` SHALL be `500` milliseconds and the default value for `maxMs` SHALL be `30000` milliseconds.
3. THE `flushGpsQueue` function in `apps/mobile/src/hooks/useTrips.ts` SHALL replace the fixed `setTimeout(5000)` reconnect delay with a call to `backoffWithJitter(retries)` where `retries` is the item's current retry count.
4. THE `fetchWithRetry` function in `supabase/functions/send-notification/index.ts` SHALL replace `setTimeout(r, 1000 * attempt)` with `setTimeout(r, backoffWithJitter(attempt))`.
5. WHEN `backoffWithJitter` is called with `attempt = 0`, THE function SHALL return a value between `500` and `1000` milliseconds.
6. WHEN `backoffWithJitter` is called with `attempt = 5`, THE function SHALL return a value no greater than `30000` milliseconds.
7. THE `backoffWithJitter` function SHALL be a pure function with no side effects, making it testable without mocks.

---

### Requirement 16: Contract Testing with Pact

**User Story:** As a developer, I want consumer-driven contract tests between the mobile app and the Edge Functions, so that breaking API changes are caught before deployment rather than discovered in production.

#### Acceptance Criteria

1. THE monorepo SHALL add `@pact-foundation/pact` as a dev dependency and configure a Pact broker or local file-based contract storage under `pacts/`.
2. THE Mobile_App consumer tests SHALL define a Pact contract for the `trip-engine` Edge_Function covering: a valid `POST` request with `tripId`, `newStatus`, `lat`, `lng`, and the expected `{ success: true }` response shape.
3. THE Mobile_App consumer tests SHALL define a Pact contract for the `send-notification` Edge_Function covering: a valid `POST` request with `targetUserId`, `title`, `body`, and the expected `{ success: true, sent: number, failed: number }` response shape.
4. THE provider verification tests SHALL run against the actual Edge Function handler logic (not a live Supabase deployment) using a mock Supabase client.
5. WHEN a contract test fails because the provider response no longer matches the consumer expectation, THE CI pipeline SHALL fail the build and report which field or status code diverged.
6. THE Pact tests SHALL be runnable via `pnpm test:contracts` and SHALL be integrated into the `ci.yml` GitHub Actions workflow.
7. THE contract tests SHALL NOT make real network calls to Supabase or Expo Push API — all external dependencies SHALL be mocked.

---

### Requirement 17: Load Testing with k6

**User Story:** As a system operator, I want load tests for the `trip-engine` and `send-notification` Edge Functions, so that I can identify throughput limits and latency regressions before a production traffic spike.

#### Acceptance Criteria

1. THE monorepo SHALL contain a `load-tests/` directory with k6 test scripts: `load-tests/trip-engine.js` and `load-tests/send-notification.js`.
2. THE `trip-engine` load test SHALL simulate 50 virtual users sending concurrent `POST` requests for 60 seconds and SHALL assert that the 95th-percentile response time is below 2000 milliseconds.
3. THE `send-notification` load test SHALL simulate 20 virtual users sending concurrent `POST` requests for 60 seconds and SHALL assert that the 95th-percentile response time is below 3000 milliseconds.
4. EACH load test script SHALL read the target URL from the `K6_TARGET_URL` environment variable so that the same script can target local, staging, or production environments.
5. EACH load test script SHALL include a ramp-up stage of 10 seconds, a sustained load stage, and a ramp-down stage of 10 seconds.
6. THE `load-tests/README.md` SHALL document how to install k6, set required environment variables, and run each test.
7. THE load tests SHALL NOT be included in the standard `pnpm test` run — they SHALL be executed manually or via a dedicated `pnpm test:load` script.

---

### Requirement 18: Semantic Versioning and Automated Changelog

**User Story:** As a developer, I want version bumps and changelogs to be generated automatically from Conventional Commits, so that releases are consistent, traceable, and do not require manual version editing.

#### Acceptance Criteria

1. THE monorepo SHALL add `semantic-release` (or `release-it` with the conventional-changelog plugin) as a dev dependency in the root `package.json`.
2. THE release configuration SHALL read commit history since the last git tag and determine the next semantic version: `fix:` commits bump the patch version, `feat:` commits bump the minor version, and commits with `BREAKING CHANGE:` in the footer bump the major version.
3. WHEN a release is triggered on the `main` branch, THE release tool SHALL create a git tag in the format `vMAJOR.MINOR.PATCH`.
4. WHEN a release is triggered, THE release tool SHALL generate or update `CHANGELOG.md` at the monorepo root with entries grouped by type (`Features`, `Bug Fixes`, `Performance Improvements`).
5. THE `.github/workflows/` directory SHALL contain a `release.yml` workflow that runs the release tool on pushes to `main` after the `ci.yml` checks pass.
6. THE release workflow SHALL use a GitHub token with write permissions to push the tag and update `CHANGELOG.md`.
7. THE release tool SHALL NOT publish packages to npm — it SHALL only manage git tags and the changelog file.

---

### Requirement 19: Webhook Signature Verification (HMAC) for ZainCash

**User Story:** As a security engineer, I want the `zaincash-webhook` Edge Function to verify the HMAC signature on every incoming request, so that only genuine ZainCash callbacks are processed and replay or forgery attacks are rejected.

#### Acceptance Criteria

1. THE `zaincash-webhook` Edge_Function SHALL read the `X-ZainCash-Signature` header from every incoming `POST` request.
2. WHEN the `X-ZainCash-Signature` header is absent, THE Edge_Function SHALL return HTTP 401 with body `{ "error": "Missing signature" }` and SHALL NOT process the payload.
3. WHEN the `X-ZainCash-Signature` header is present, THE Edge_Function SHALL compute an HMAC-SHA256 digest of the raw request body using the secret stored in the `ZAINCASH_WEBHOOK_SECRET` environment variable.
4. WHEN the computed HMAC digest does not match the value in `X-ZainCash-Signature`, THE Edge_Function SHALL return HTTP 403 with body `{ "error": "Invalid signature" }` and SHALL NOT process the payload.
5. WHEN the computed HMAC digest matches the value in `X-ZainCash-Signature`, THE Edge_Function SHALL proceed to process the payment confirmation payload.
6. THE HMAC comparison SHALL use a constant-time comparison function to prevent timing attacks.
7. THE `ZAINCASH_WEBHOOK_SECRET` environment variable SHALL be documented in `.env.example` as a required secret for production deployment.
8. WHEN signature verification fails, THE Edge_Function SHALL call `logger.warn` with the request origin and failure reason, and SHALL NOT call `console.log`.

---

### Requirement 20: Optimistic UI Updates in useSubscriptions and useActiveTrips

**User Story:** As a student, I want subscription cancellations and trip status changes to reflect immediately in the UI, so that the interface feels responsive even on slow Iraqi mobile networks.

#### Acceptance Criteria

1. THE `useSubscriptions` hook SHALL expose a `cancelSubscription(subscriptionId: string): Promise<void>` function that immediately updates the local `subscriptions` state to mark the target subscription as `status: 'cancelled'` before the server call completes.
2. WHEN the server call to `cancel_subscription()` RPC succeeds, THE `useSubscriptions` hook SHALL call `refetch()` to synchronize the confirmed server state.
3. WHEN the server call to `cancel_subscription()` RPC fails, THE `useSubscriptions` hook SHALL revert the local `subscriptions` state to its pre-cancellation value and set an error message.
4. THE `useActiveTrips` hook SHALL apply the same optimistic update pattern: WHEN a trip status update is dispatched locally, THE hook SHALL update the local `trips` state immediately, then confirm or revert based on the server response.
5. WHEN an optimistic update is applied, THE Mobile_App SHALL NOT show a loading spinner for the affected item — it SHALL show the updated state immediately.
6. WHEN an optimistic update is reverted due to a server error, THE Mobile_App SHALL display an error message to the user within 500 milliseconds of receiving the error response.
7. THE optimistic update logic SHALL be implemented without introducing new external libraries — it SHALL use the existing React `useState` and the existing Supabase client.

---

### Requirement 21: pg_stat_statements Monitoring and Slow Query Alerting

**User Story:** As a database engineer, I want slow query statistics collected and alerted on, so that I can identify and optimize queries that degrade under production load before they impact users.

#### Acceptance Criteria

1. THE database SHALL have a Migration that enables the `pg_stat_statements` extension via `CREATE EXTENSION IF NOT EXISTS pg_stat_statements`.
2. THE Migration SHALL create a database view `slow_queries_view` that queries `pg_stat_statements` and returns rows where `mean_exec_time > 500` milliseconds, ordered by `mean_exec_time DESC`, limited to 50 rows.
3. THE Admin_App analytics page SHALL include a "Slow Queries" section that fetches from `slow_queries_view` via an RPC and displays the top 10 slowest queries with their mean execution time and call count.
4. THE Migration SHALL create a Supabase scheduled function (pg_cron job) named `alert_slow_queries` that runs every 60 minutes and inserts a row into an `alerts` table when any query in `pg_stat_statements` has `mean_exec_time > 1000` milliseconds and `calls > 100`.
5. THE `alerts` table SHALL have columns: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `alert_type TEXT NOT NULL`, `details JSONB`, `created_at TIMESTAMPTZ DEFAULT NOW()`.
6. THE `slow_queries_view` and `alerts` table SHALL be accessible only to the `service_role` — no RLS policy SHALL grant student or driver access.

---

### Requirement 22: Stale-While-Revalidate for Feature Flags and Routes

**User Story:** As a mobile user, I want feature flags and route lists to load instantly from cache on app launch, so that the app is usable immediately even before the network request completes.

#### Acceptance Criteria

1. THE `useFeatureFlags` hook SHALL implement the SWR_Pattern: on mount it SHALL immediately return the flags from the Zustand Feature_Flags_Store (Requirement 12) as the initial state, then fetch fresh flags from Supabase in the background and update the store when the response arrives.
2. WHEN the background fetch for feature flags completes successfully, THE `useFeatureFlags` hook SHALL update the Feature_Flags_Store with the new values without causing a loading spinner to appear.
3. THE `useRoutes` hook in `apps/mobile/src/hooks/useRoutes.ts` SHALL implement the SWR_Pattern: on mount it SHALL return any previously cached routes from a Zustand routes store slice immediately, then fetch fresh routes in the background.
4. THE routes cache SHALL be stored in a new `routesCache` Zustand store slice with shape `{ routes: Route[]; cachedAt: string | null; setRoutes: (routes: Route[]) => void }`.
5. THE `routesCache` Zustand store slice SHALL persist to AsyncStorage so that the cache survives app restarts.
6. WHEN the cached routes are older than 5 minutes (based on `cachedAt`), THE `useRoutes` hook SHALL treat the cache as stale and trigger a background refresh immediately on mount.
7. WHEN the background refresh for routes fails and a valid cache exists, THE `useRoutes` hook SHALL continue displaying the cached routes and SHALL call `logger.warn` with the fetch error.
8. THE SWR implementation SHALL NOT use any new external SWR library — it SHALL be implemented using existing React hooks and the Zustand store.

---

### Requirement 23: OpenAPI Specification for Edge Functions

**User Story:** As a developer integrating with the UniRide backend, I want a machine-readable OpenAPI specification for all Edge Functions, so that I can generate typed clients, validate requests, and understand the API contract without reading source code.

#### Acceptance Criteria

1. THE monorepo SHALL contain an `openapi.yaml` file at `docs/openapi.yaml` describing all four Edge Functions: `trip-engine`, `send-notification`, `zaincash-checkout`, and `zaincash-webhook`.
2. THE OpenAPI spec SHALL define the request body schema for `trip-engine` with required fields `tripId` (string, UUID format), `newStatus` (string, enum of valid TripStatus values), and optional fields `lat` (number) and `lng` (number).
3. THE OpenAPI spec SHALL define the response schema for `trip-engine` with `200 { success: true }`, `400 { error: string }`, `401 { error: string }`, `429 { error: string }`.
4. THE OpenAPI spec SHALL define the request body schema for `send-notification` with required fields `targetUserId` (string, UUID), `title` (string), `body` (string), and optional `data` (object).
5. THE OpenAPI spec SHALL define the response schema for `send-notification` with `200 { success: boolean, sent: integer, failed: integer, cleaned: integer }`.
6. THE OpenAPI spec SHALL define the `zaincash-webhook` endpoint with the `X-ZainCash-Signature` header as a required security parameter.
7. THE OpenAPI spec SHALL use OpenAPI 3.1.0 format and SHALL be validated with a linter (e.g., `@stoplight/spectral-cli`) as part of the CI pipeline.
8. THE `docs/openapi.yaml` SHALL include a `servers` section listing the Supabase Edge Function base URL pattern `https://{project_ref}.supabase.co/functions/v1`.

---

### Requirement 24: Runbook Documentation

**User Story:** As an on-call operator, I want runbooks for the most common failure scenarios, so that I can resolve incidents quickly without needing to understand the full codebase.

#### Acceptance Criteria

1. THE monorepo SHALL contain a `docs/runbooks/` directory with individual runbook files in Markdown format.
2. THE `docs/runbooks/trip-engine-errors.md` runbook SHALL document: how to identify rate limit exhaustion (HTTP 429), how to check the `rate_limits` table, and how to reset a user's rate limit counter.
3. THE `docs/runbooks/push-notification-failures.md` runbook SHALL document: how to identify `DeviceNotRegistered` errors in logs, how to query the `push_tokens` table for stale tokens, and how to manually trigger a token cleanup.
4. THE `docs/runbooks/migration-rollback.md` runbook SHALL document: how to check which migrations have been applied (`supabase migration list`), how to roll back the most recent migration, and the constraint that soft-delete migrations cannot be rolled back without data loss.
5. THE `docs/runbooks/realtime-channel-errors.md` runbook SHALL document: how to identify `CHANNEL_ERROR` and `TIMED_OUT` events in Sentry, the expected auto-reconnect behavior, and when to escalate to a Supabase support ticket.
6. EACH runbook SHALL include a "Symptoms", "Diagnosis Steps", "Resolution Steps", and "Escalation" section.
7. THE `docs/runbooks/README.md` SHALL list all available runbooks with a one-line description of each.

---

### Requirement 25: Input Sanitization Layer for Edge Functions

**User Story:** As a security engineer, I want all Edge Functions to validate and sanitize untrusted input before processing, so that oversized payloads, unexpected field types, and injection attempts are rejected at the boundary.

#### Acceptance Criteria

1. THE monorepo SHALL contain a shared module at `supabase/functions/_shared/sanitize.ts` that exports a `sanitizeInput<T>(schema: ZodSchema<T>, rawBody: unknown): { data: T } | { error: string }` function.
2. THE `sanitizeInput` function SHALL use the Zod schema passed as the first argument to parse and validate `rawBody`, returning `{ data }` on success and `{ error }` with the first validation error message on failure.
3. THE `trip-engine` Edge_Function SHALL define a Zod schema for its request body and call `sanitizeInput` before accessing `tripId`, `newStatus`, `lat`, or `lng`.
4. THE `send-notification` Edge_Function SHALL define a Zod schema for its request body and call `sanitizeInput` before accessing `targetUserId`, `title`, `body`, or `data`.
5. THE `zaincash-webhook` Edge_Function SHALL define a Zod schema for its request body and call `sanitizeInput` before processing the payment payload.
6. WHEN `sanitizeInput` returns `{ error }`, THE Edge_Function SHALL return HTTP 400 with the error message and SHALL NOT process the request further.
7. THE `sanitizeInput` function SHALL enforce a maximum body size of 64 KB by checking `JSON.stringify(rawBody).length` before parsing, returning `{ error: "Payload too large" }` if exceeded.
8. THE `title` and `body` fields in the `send-notification` schema SHALL be validated as strings with a maximum length of 255 characters each.
9. THE `sanitize.ts` module SHALL import Zod from `https://esm.sh/zod@3` to remain compatible with the Deno ESM import system used by all Edge Functions.
