# Codebase Audit Report

**Date:** May 13, 2026

An automated static analysis and code review was performed on the `@uniride/core` logic, Supabase migrations, Edge Functions, and frontend applications. While the codebase strictly adheres to type-safety, tests pass, and it generally follows clean architecture principles, several critical logical and architectural issues were identified.

## 1. CRITICAL BUG: Double Increment on Subscription Cancellation

**Location:**

- `supabase/migrations/2026051116_search_path_and_audit_hardening.sql` (RPC: `cancel_subscription`)
- `supabase/migrations/2026051004_phase0_fixes.sql` (Trigger: `on_subscription_cancel`)

**Description:**
When a student cancels their subscription, the `cancel_subscription` RPC manually increments the `available_seats` count on the `routes` table by 1. However, there is already an `AFTER UPDATE` trigger (`on_subscription_cancel`) that watches for a status change to `cancelled` and _also_ increments `available_seats` by 1.
**Impact:**
This causes `available_seats` to be incremented by 2 instead of 1. This will likely violate the `available_seats <= capacity` CHECK constraint (causing the transaction to fail and preventing cancellation) or lead to incorrect capacity tracking.

**Remediation:**
Remove the manual `UPDATE routes SET available_seats = available_seats + 1` from the `cancel_subscription` RPC and rely entirely on the trigger, or vice versa.

---

## 2. Race Condition: Missing Unique Constraint on Subscriptions

**Location:** Database Schema (`subscriptions` table)

**Description:**
While the `reserve_seat` RPC uses pessimistic locking (`FOR UPDATE`) to prevent overbooking on the route, there is no unique constraint on the `subscriptions` table to prevent a student from creating multiple active/pending subscriptions for the same route if two concurrent requests are sent.

**Remediation:**
Add a partial unique index:

```sql
CREATE UNIQUE INDEX idx_unique_active_subscription
ON subscriptions (student_id, route_id)
WHERE status IN ('active', 'pending');
```

---

## 3. Inconsistent Driver Identity (Foreign Keys)

**Location:** Database Schema (`trips`, `routes`, `ratings` tables)

**Description:**
The schema uses `drivers.id` (which is the Primary Key of the `drivers` table) as the foreign key in the `trips` and `routes` tables. However, it uses `auth.users.id` (the ID from Supabase Auth) in the `ratings` table. While currently handled via mapping in RPCs, this inconsistency increases architectural complexity and the risk of JOIN errors.

**Remediation:**
Standardize driver identity across all tables to point to either `drivers.id` or `auth.users.id`.

---

## 4. Reliability Risk: Unawaited Promises in Edge Functions

**Location:** `supabase/functions/send-notification/index.ts`

**Description:**
The function uses a "fire-and-forget" promise for token cleanup (`cleanupInvalidTokens`). In serverless environments like Deno/Supabase Edge Functions, promises that are not awaited before the `Response` is returned can be forcefully terminated by the runtime, preventing the cleanup from occurring.

**Remediation:**
Wrap the background task in `EdgeRuntime.waitUntil(cleanupInvalidTokens(...))` to ensure it finishes execution before the worker shuts down.

---

## 5. RLS Policy UX Limitation

**Location:** `supabase/migrations/2026051002_trip_state_machine_and_rls.sql`

**Description:**
The Row Level Security (RLS) policy on the `trips` table restricts students to only viewing active trips for routes they are already subscribed to.
**Impact:**
Students cannot see live bus locations or statuses for routes they are _considering_ joining. This limits UX flexibility.

**Remediation:**
Re-evaluate business requirements. If students should be able to view live trips before subscribing, adjust the RLS policy to allow `SELECT` for all authenticated students.

---

## 6. CRITICAL SECURITY FLAW: RLS Bypass in `update_trip_status`

**Location:** `supabase/migrations/2026051116_search_path_and_audit_hardening.sql`

**Description:**
The `update_trip_status` RPC is declared with `SECURITY DEFINER` (which bypasses RLS) and has a default parameter for driver authorization: `p_driver_id UUID DEFAULT NULL`. Crucially, its internal authorization check is written as:
`IF p_driver_id IS NOT NULL AND v_trip_driver_id != p_driver_id THEN RAISE EXCEPTION ...`
Because execution permissions are not explicitly revoked from `PUBLIC` by default in Postgres, any authenticated (or even anonymous) user can call this RPC directly from the client. By intentionally omitting the `p_driver_id` parameter, the authorization check evaluates to `FALSE` (since null is not not-null) and the security check is completely bypassed.
**Impact:**
Any user can manipulate the state machine and change the status of _any_ trip in the system, bypassing Edge Function restrictions.

**Remediation:**

1. Revoke public execute access: `REVOKE EXECUTE ON FUNCTION update_trip_status FROM public;`
2. Remove the `DEFAULT NULL` from `p_driver_id` or change the logic to enforce a strict equality check that does not allow nulls to bypass it.

---

## 7. Architectural Violation: Hardcoded UI Strings (i18n)

**Location:** `apps/mobile/app/login.tsx`, `apps/mobile/app/booking.tsx`, etc.

**Description:**
The `GEMINI.md` explicitly mandates: "Hardcoded UI strings are prohibited; developers must utilize centralized translation keys from `@uniride/core`." However, files like the `LoginScreen` extensively use hardcoded Arabic strings (e.g., `'تسجيل الدخول'`, `'إنشاء حساب جديد'`). While the `useTranslation` hook is imported, it is not being utilized for the actual text nodes in the render tree.
**Impact:**
Violates project conventions, prevents successful localization into English, and makes string maintenance difficult.

**Remediation:**
Refactor all hardcoded strings in the UI to use the `t('key')` function from the centralized translation dictionary.
