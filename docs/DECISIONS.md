# Product And Architecture Decisions

This file is the decision log for UniRide Core 1.0. When older docs conflict with this file, this file wins until the older docs are updated.

## Final Decisions

| Area | Decision |
| --- | --- |
| Product model | Monthly university transit subscriptions |
| Driver workload | Smart assistance with driver confirmation |
| GPS | Lightweight active-trip tracking only |
| Trip state | Manual confirmation for sensitive events |
| Pricing | Configured in admin dashboard, never hardcoded in app code |
| Financial source of truth | Database RPCs and stored snapshots |
| Subscription creation | Transactional RPC only |
| Critical DB writes | RPC or repository-mediated server action |
| RLS tests | Must run against real Supabase/local Supabase |
| Driver identity | `driver_id` always references `drivers.id`, not `profiles.id` |
| Dead/prototype code | Removed or isolated from production checks |

## Financial Decisions

- No hardcoded subscription fee, commission, discount, cancellation fee, or absence deduction in mobile/admin UI.
- Admin dashboard controls pricing policies.
- A subscription stores the policy snapshot used at activation time.
- Historical subscriptions do not silently change when pricing policy changes.
- Every financial operation creates or updates auditable financial records.
- Client-side financial display must use values returned from the database.

## GPS And Smart Driver Assistance Decisions

- GPS is optional support, not the source of truth for trip completion.
- GPS runs only after trip start and stops when trip ends.
- The system may auto-send non-sensitive notifications such as "driver nearby".
- The system must not automatically mark a student as picked up.
- Driver can always override suggestions.
- The first version stores latest location and minimal trip tracking state; full path history is optional later.

## State Machine Decisions

Use route-level and stop-level state separately.

Route/trip-level examples:

- `scheduled`
- `active`
- `arriving_destination`
- `completed`
- `cancelled`

Stop/student-level examples:

- `pending`
- `next`
- `driver_nearby`
- `driver_waiting`
- `picked_up`
- `absent`
- `dropped_off`
- `skipped`

Sensitive state transitions require driver confirmation:

- `picked_up`
- `absent`
- `dropped_off`
- `completed`
- `cancelled`

System-suggested transitions may be shown to the driver:

- `driver_nearby`
- `driver_waiting`
- next stop suggestion
- destination arrival suggestion

## Auth Decision Status

Auth is not finalized in this document. The codebase currently contains conflicting OTP and email/password references.

Before Core 1.0 implementation continues, choose one:

- Email/password.
- Phone OTP.
- Email OTP.

Once selected:

- Remove stale auth code.
- Update RLS tests.
- Update admin user creation.
- Update onboarding.
- Update docs.

## Non-Negotiable Engineering Rules

- Fix failing tests, typecheck, and build before adding new features.
- Write docs and tests before changing business behavior.
- Do not duplicate financial logic across mobile, admin, and SQL.
- Do not let UI create financial records directly.
- Do not allow skipped RLS tests to count as security coverage.
- Do not keep code that represents rejected product decisions.

## Task Template

Every new task must include:

```md
## Goal
What user or business problem is solved?

## Out Of Scope
What is intentionally not included?

## Product Decision
Which approved decision does this implement?

## Database Impact
Tables, RPCs, migrations, RLS, indexes.

## Mobile Impact
Screens, hooks, stores, notifications.

## Admin Impact
Pages, server actions, forms, reports.

## Tests
Unit, integration, RLS, E2E, failure cases.

## Acceptance Criteria
The exact commands and user flows proving completion.
```

