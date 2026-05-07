# Technical Debt Exit Plan

## Objective

Reach UniRide Core 1.0 with one coherent product direction, no contradictory business logic, no dead production code, no broken builds, and no untested critical paths.

## Current Problem

The codebase contains overlapping decisions:

- OTP vs email/password auth references.
- Manual-only transit vs GPS-assisted transit.
- Hardcoded/default financial assumptions vs admin-managed policy.
- Client-side subscription writes vs RPC-based transactional writes.
- Mocked tests that do not prove database security or concurrency.
- Prototype artifacts affecting production checks.
- Conflicting docs that describe old behavior.

## Exit Strategy

### Phase 0 - Freeze And Baseline

- Stop feature work except stabilization.
- Record current command results.
- Keep a single stabilization branch.
- Mark conflicting docs as superseded by `DECISIONS.md`.

Acceptance:

- Baseline report exists.
- Known failures are listed.

### Phase 1 - Product Decisions

- Finalize auth method.
- Finalize pricing policy model.
- Finalize route and stop state machine.
- Finalize GPS/light tracking boundaries.
- Finalize admin responsibilities.

Acceptance:

- `DECISIONS.md` is complete for Core 1.0.
- No implementation proceeds without matching decision.

### Phase 2 - Build Health

- Fix root `pnpm run typecheck`.
- Fix mobile typecheck.
- Fix admin typecheck.
- Fix admin build.
- Fix mobile build.
- Isolate or repair `mockup-sandbox`.

Acceptance:

```bash
pnpm run typecheck
pnpm --filter ./artifacts/admin-dashboard build
pnpm --filter ./artifacts/mobile build
```

### Phase 3 - Financial Policy Refactor

- Replace broken `app_settings` financial reads.
- Add `pricing_policies`.
- Add `financial_events`.
- Store subscription snapshots.
- Remove frontend financial decision logic.
- Replace mismatched RPC signatures.

Acceptance:

- Financial tests cover fixed and percentage policies.
- Historical subscriptions keep snapshots.
- No hardcoded business-critical money values remain in frontend logic.

### Phase 4 - Transactional Database Core

- Rebuild subscription request and activation flow around RPCs.
- Fix card activation.
- Add seat locking and overbooking prevention.
- Add idempotency to payment/activation operations.
- Harden RLS and RPC authorization.

Acceptance:

- Concurrent booking tests run against real DB.
- RLS tests run against real DB.

### Phase 5 - Mobile Core Flow

- Clean auth flow.
- Clean role registration.
- Implement student subscription request.
- Implement driver approval.
- Implement activation/payment display.
- Implement active trip and student trip state.
- Implement smart driver trip screen.

Acceptance:

- Student and driver can complete the core flow end to end.
- Driver does not need to manage every event from a large manual list.

### Phase 6 - Admin Core Flow

- Admin manages pricing policies.
- Admin manages users and routes.
- Admin manages subscription activation/cancellation.
- Admin views trips and financial events.
- Admin actions are protected by `requireAdmin`.

Acceptance:

- Admin build passes.
- Every mutation is authorized and validated.

### Phase 7 - Cleanup

- Remove stale OTP code if auth decision excludes OTP.
- Remove dead components and hooks.
- Remove old financial constants from business logic.
- Remove direct client writes for sensitive records.
- Remove or isolate prototype apps from production checks.

Acceptance:

- `rg` checks show no stale decision remnants.
- Tests and builds still pass.

### Phase 8 - CI And Release Gate

CI must run:

- Format check.
- Typecheck.
- Unit tests.
- Integration tests.
- Real Supabase RLS tests.
- Admin build.
- Mobile build.
- Audit.

Acceptance:

- No release is allowed if any gate fails.

## Dead Code Rules

Delete or isolate code when it:

- Is not imported by the production app.
- Calls tables or columns that do not exist.
- Represents a rejected product decision.
- Duplicates financial logic.
- Is a prototype affecting production build/typecheck.
- Is a test that proves only a mock but is labeled as real coverage.

## Conflict Resolution Rules

When code conflicts:

1. `DECISIONS.md` wins.
2. Database/RPC source of truth wins over UI assumptions.
3. Admin-configured financial policy wins over constants.
4. Driver confirmation wins over automatic sensitive state.
5. Real DB tests win over mocks for RLS, finance, and concurrency.

## Target Scorecard

| Area | Target |
| --- | --- |
| Build health | 10/10 |
| Financial correctness | 10/10 |
| RLS/security | 10/10 |
| Mobile core flow | 10/10 |
| Admin core flow | 10/10 |
| Driver usability | 10/10 |
| Test reliability | 10/10 |
| Documentation consistency | 10/10 |

