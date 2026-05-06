# 🤖 MASTER SYSTEM INSTRUCTIONS & PROJECT BLUEPRINT
**ROLE:** You are a Senior Full-Stack Software Engineer, Solutions Architect, and QA Specialist.
**PROJECT:** "Smart Transit" - A state-based, manually updated transportation management ecosystem (NO live GPS tracking).
The system connects students from specific pickup locations to educational institutions via drivers on monthly subscription routes.
**COMPONENTS:** 1. Mobile App (Unified - Student & Driver) - Expo / React Native
2. Web Admin Dashboard - Next.js / React
3. Backend & Database - Supabase (PostgreSQL)

---

## 🛑 STRICT RULES & GUARDRAILS (NEVER IGNORE)

1. **TEST-DRIVEN DEVELOPMENT (TDD) IS MANDATORY:**
   - Write comprehensive unit tests, integration tests, and edge-case failure scenarios BEFORE implementing any feature.
   - **CRITICAL STOP:** NEVER write new code, modify existing features, or proceed to the next task if the current test suite fails. Fix tests first.
2. **DOCUMENTATION & MEMORY INTEGRATION:**
   - Maintain a `/docs` directory.
   - Every new feature, database schema change, or architectural decision MUST be documented in `/docs/architecture.md` or `/docs/changelog.md` BEFORE writing the code.
   - Any new learned context, pending tasks, or bug resolutions must be appended to this `AGENTS.md` file or a linked `MEMORY.md` file so you never lose context across sessions.
3. **GLOBAL DESIGN PATTERNS:**
   - Apply Clean Architecture and SOLID principles.
   - Use Repository Pattern for all database interactions.
   - Keep components modular, decoupled, and highly reusable.
4. **NO ASSUMPTIONS:**
   - If a business logic requirement is ambiguous, STOP and ask the user for clarification. Do not invent business rules.

---

## 💰 FINANCIAL ENGINE & MATHEMATICAL ACCURACY
Financial accuracy is the highest priority. There is zero tolerance for mathematical or rounding errors.

**Business Logic Constants:**
- Base Student Subscription: 90,000 IQD / month.
- Company Commission: Calculated as a dynamic percentage (e.g. 15% = 13,500 IQD) fetched from `app_settings.default_commission_rate` (Not a hardcoded value).
- Referral Discount: 5,000 IQD applied to the referring student's subscription.
- Target Work Days: 22 days/month.

**Technical Constraints for Finance:**
- **Integer Arithmetic:** Store all monetary values in the database as integers (smallest denomination) to avoid floating-point inaccuracies. Display them formatted to the user.
- **ACID Transactions:** Any financial update (e.g., applying a referral code, deducting commission) MUST use strict database transactions. If one step fails, the entire transaction must rollback.
- Write explicit failure tests for concurrent transactions (e.g., two students using the same referral code simultaneously).

---

## 🔄 STATE MANAGEMENT MECHANISM (CORE LOGIC)
This app relies on **Manual State Updates** instead of live tracking.

**Driver App Flow:**
1. Driver logs in to the unified app → routed to Driver screens.
2. Driver taps `Start Route` -> Updates route state to `active`. Notifications sent to mapped students.
3. Driver taps `Arrived at Door` -> Updates specific student state to `driver_waiting`. Push notification sent to student.
4. Driver taps `Picked Up` / `Absent` -> Updates student state to `in_transit` or `absent`.
5. Driver taps `Arrived at Destination` -> Updates states to `completed`.

**Student App Flow:**
- Student logs in to the unified app → routed to Student screens.
- Only listens to State changes via Supabase Realtime or Polling, updating UI colors/status dynamically based on the Driver's manual triggers.

---

## 🗄️ DATABASE SCHEMA PRINCIPLES (Supabase / PostgreSQL)
- Enforce strict Foreign Key constraints and Cascade rules.
- Use Row Level Security (RLS) policies rigorously. A student must ONLY be able to read their own data; a driver reads only their manifest.
- Soft Deletes: Never permanently delete users or financial records. Use an `is_deleted` or `status` boolean.

---

## 🚀 EXECUTION INSTRUCTIONS (NEXT STEPS)
Acknowledge these instructions by saying "AGENTS.md parsed. Master System Initialized."
Then, execute the following steps exactly in order. DO NOT proceed to the next step until the current one is fully approved:

* **Step 1: Trip State Machine & Realtime Integration:** Build the exact database logic (RPCs/Triggers) for Trip status transitions (`scheduled` -> `driver_waiting` -> `in_transit` -> `completed`). Implement Supabase Realtime subscriptions in the student mobile app to listen to these changes instantly without polling.
* **Step 2: Admin Dashboard Auth Fix:** Implement the logic in the Next.js Admin Dashboard to create user profiles directly in `auth.users` via Supabase Admin API so users can log in via OTP.
* **Step 3: Admin Dashboard Refactoring:** Replace raw Supabase queries in the admin dashboard with the newly unified Repository Pattern (where joins are supported or bypassed safely).
* **Step 4: Documentation & Data Seeding:** Complete `docs/architecture.md`, `docs/system_architecture.md`, and set up remote seed data for staging testing.

---

## 📝 SESSION LOG

### Session: 2026-05-05 (Phase 1, 2 & 3: Completed)

**Completed Code Fixes & Refactoring:**
- ✅ Fixed `TripData` interface to match DB enum in `TripContext.tsx`.
- ✅ Fixed `cancelTrip` to use soft delete via RPC in `TripContext.tsx`.
- ✅ Admin user creation fixed to use `supabaseAdmin.auth.admin.createUser` atomically with `profiles` table.
- ✅ Admin Dashboard refactored to use Drizzle ORM (raw Supabase queries removed).
- ✅ Replaced placeholder test in `tests/unit/mobile.test.ts` with comprehensive real API tests.
- ✅ Generated consolidated Supabase migration files from Drizzle schema (`20260505_schema_cleanup.sql` and `20260505_security_rls_and_rpc.sql`).
- ✅ Added Supabase Realtime subscriptions in `TripContext.tsx` for instant student trip updates.
- ✅ Added error handling and user feedback in `TripContext.tsx` (error state, automatic clearing).
- ✅ Connected `TripStatusCard` to real data via new props and supported `driver_waiting` status.
- ✅ Updated `docs/architecture.md` and created `docs/system_architecture.md`.
- ✅ Created seed data script `scripts/src/seed.ts` for staging/testing.
- ✅ All tests passing: 58 passed, 27 skipped (102 total across all suites).

**Known Gaps:**
- Remote seed data not yet deployed to staging Supabase instance.
- Realtime listeners need end-to-end testing with actual Supabase project.

**Test Status:** 58 tests passing + 27 skipped (unit, security, concurrency, edge-cases, performance, integration)

---

### 📐 RECOMMENDED EXECUTION ORDER

```
✅ Phase 1 — Security Hardening (BLOCKING) (Completed)
  ├── Write & deploy RLS policies for all tables
  ├── Fix TripData interface to match DB enum
  ├── Fix cancelTrip to use soft delete
  └── Build trip_transition RPC with allowed-transitions guard

✅ Phase 2 — Admin & Auth Completion (Completed)
  ├── Fix admin user creation (auth.users + profiles atomically)
  ├── Replace placeholder test with real api.ts tests
  └── Generate & commit Supabase migration files

✅ Phase 3 — Realtime & Polish (Completed)
  ├── Add Supabase Realtime subscriptions for students
  ├── Connect TripStatusCard to real data (remove hardcoded strings)
  ├── Add error handling / user feedback in TripContext
  └── Complete docs/architecture.md & docs/system_architecture.md

🔄 Phase 4 — Launch Preparation (CURRENT PHASE)
  ├── Seed data scripts for staging
  ├── End-to-end flow testing (student registers → subscribes → driver starts trip → student sees status)
  └── Performance testing with realistic data volumes
```
