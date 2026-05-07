# UniRide Changelog

## 2026-05-07 — Core 1.0 Direction Reset

### Product Direction
- Added `docs/PRODUCT_CORE.md` as the source for the UniRide Core 1.0 product goal.
- Added `docs/DECISIONS.md` as the decision log for resolving conflicting product and architecture behavior.
- Added `docs/FINANCIAL_POLICY.md` to define admin-managed pricing policies and remove hardcoded business-critical financial values.
- Added `docs/SMART_DRIVER_ASSISTANCE.md` to define lightweight active-trip GPS and smart driver assistance.
- Added `docs/TECH_DEBT_EXIT_PLAN.md` to define the full technical debt cleanup plan and release gates.

### Important Decision Changes
- Financial values must be configured from the admin dashboard, not hardcoded in mobile/admin code.
- GPS is allowed as lightweight active-trip assistance, not full-time tracking and not the source of truth for sensitive events.
- Driver experience should use smart suggestions and confirmation, not a high-friction manual workflow for every small event.
- Older architecture docs are now supplemented by the Core 1.0 decision documents.

## 2026-05-07 — Security & Financial Overhaul

### Security Fixes (P0)
- **1.1.1** Added `requireAdmin()` to `deleteRoute()` in `admin-dashboard/src/app/dashboard/routes/actions.ts`
- **1.1.2** Fixed open redirect in `auth/callback/route.ts` — `next` param validated against whitelist
- **1.1.3** Fixed `useTripRealtime` — was disabled for all users due to `driver` variable aliasing `user`. Now properly checks `role === 'student'` for student listeners and `role === 'driver'` for driver listeners
- **1.1.4** Wired up rate limiting in `login/actions.ts` and `lib/actions.ts`. Added periodic cleanup of expired entries. Prefer `x-real-ip` over `x-forwarded-for`
- **1.1.5** Added `is_activated` to blocked keys in `useUpdateProfile.ts` (prevents client-side activation bypass)
- **1.1.6** Restricted CORS on `send-notification` Edge Function — replaced `Access-Control-Allow-Origin: *` with env-based `ALLOWED_ORIGINS`

### Financial Engine Fixes (P0)
- **1.2.1** Fixed `calculatePerTripCost` — replaced `Math.log10` with integer-safe `Math.floor(totalCents / totalTrips)`. `calculatePerTripCost(90000, 22, 2)` now correctly returns 2045
- **1.2.2** Fixed floating-point division on subscription page — replaced raw division with `calculatePerTripCost` and `calculateCommission` from `lib/money.ts`
- **1.2.3** Fixed commission calculation — was computing per-trip instead of per-student percentage
- **1.2.4** Fixed `useCancelSubscription` — replaced direct `supabase.from('subscriptions').update()` with `cancel_subscription_with_refund` RPC call
- **1.2.5** Fixed `useBookRoute` — replaced non-transactional insert with `process_subscription_payment` RPC call
- **1.2.6** Fixed `PriceBreakdown` hardcoded commission rate — replaced `COMMISSION_RATE = 0.15` with `useAppSettings` hook
- **1.2.7** Fixed `commission_bps` naming confusion — renamed to `commission_amount_iqd` in mobile app layer, mapped from DB `commission_bps` in `useAppSettings`

### Bug Fixes (P1)
- **2.1** Fixed analytics page crash — replaced `.select('created_at, amount')` with `.select('created_at, monthly_fee, commission_amount, driver_payout')`
- **2.2** Added logout button handler — created `LogoutButton` client component with `supabase.auth.signOut()`
- **2.3** Fixed `TableBody` className — replaced regular string with template literal
- **2.4** Removed `asChild` prop from Button component (no Radix dependency)
- **2.5** Fixed RTL — changed `I18nManager.forceRTL(false)` to `forceRTL(true)`
- **2.6** Fixed user search/filter — added `findAllFiltered` and `countFiltered` to profile repository with `ilike` and `eq` conditions
- **2.7** Fixed onboarding university storage — now stores `institution_id` instead of Arabic name string
- **2.8** Fixed card activation — replaced multi-step client-side logic with `activate_card` RPC (atomic card validation + subscription creation)
- **2.9** Fixed `startTrip` skipping `scheduled` state — now inserts with `scheduled` then transitions via `transition_trip_status` RPC
- **2.10** Fixed seed script `payment_status` — changed `'active'` to `'paid'`

### Architecture Unification
- **4.2.1** Removed 6 legacy Context files (`AuthContext`, `DriverContext`, etc.) — kept `context/index.tsx` as re-export hub
- **4.3** Removed dead code: `DataTableServer.tsx`, `SearchFilters.tsx`, `OtpInput.tsx`, `mobile/server/` directory
- **4.4** Removed dead `/dashboard/cards` link from sidebar

### Admin Dashboard
- **6.1** Added `requireAdmin()` to all dashboard pages (home, analytics, subscriptions, trips)
- **6.2** Fixed metadata from "Create Next App" to "UniRide Admin". Changed `<html lang="en">` to `<html lang="ar" dir="rtl">`
- **6.4** Added logout handler, removed dead cards link

### Production Readiness
- **8.1** Fixed `.gitignore` — removed markdown code fences, added `.env` patterns, added `GEMINI.md`/`replit.md` to ignore

### Test Suite
- Rewrote `financial-engine.test.ts` to use real `lib/money.ts` functions instead of mock implementations
- Rewrote `rls-auth.test.ts` with real Supabase client integration (gated behind env vars)
- Updated `mobile.test.ts` with real money calculation tests
- Rewrote `financial-and-db.test.ts` integration tests using real money module
- Fixed `comprehensive.test.ts` — replaced `usersTable`/`InsertUser` with `profilesTable`/`InsertProfile`
- Created `tests/helpers/test-db.ts` — test DB client factory and data factories

### New Files
- `artifacts/admin-dashboard/src/lib/supabase-browser.ts` — browser-side Supabase client
- `artifacts/admin-dashboard/src/app/dashboard/LogoutButton.tsx` — client-side logout
- `supabase/migrations/2026050701_activate_card_rpc.sql` — `activate_card` RPC
- `tests/helpers/test-db.ts` — test infrastructure
