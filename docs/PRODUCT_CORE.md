# UniRide Core 1.0

## Product Goal

UniRide Core 1.0 is a smart university transit management system for monthly student transportation. It connects students with approved drivers and routes, while the admin dashboard remains the source of truth for pricing, policies, users, routes, subscriptions, and operational control.

The product must reduce driver workload through smart assistance, not by forcing drivers to manually manage every tiny state change. The driver confirms important events; the system handles ordering, location hints, reminders, and lightweight tracking during active trips only.

## Core Product Scope

The product is:

- A monthly subscription transit system.
- A student and driver mobile app.
- A central admin dashboard.
- A Supabase-backed system with RLS and transactional RPCs.
- A manually confirmed trip state system enhanced with lightweight GPS and smart suggestions.
- A configurable financial system managed from the admin dashboard.

The product is not:

- A live ride-hailing marketplace like Uber.
- A full-time driver surveillance system.
- A system with hardcoded financial values in the app code.
- A collection of unfinished prototype flows.
- A place where mobile, admin, and database each calculate finance differently.

## Product Actors

### Student

The student can:

- Register or sign in.
- Complete a profile.
- View available routes or assigned driver options.
- Request a monthly subscription.
- Activate a subscription through admin-approved payment/card flow.
- See current trip status.
- See the driver's approximate live location during an active trip when available.
- Receive notifications for important trip state changes.

### Driver

The driver can:

- Register or sign in.
- Complete vehicle and service profile.
- View subscription requests.
- Accept or reject students.
- Start a trip.
- See the next suggested student stop.
- Confirm picked up, absent, skipped, or dropped off.
- End a trip.
- Override system suggestions when needed.

### Admin

The admin can:

- Manage users, drivers, students, routes, institutions, subscriptions, and policies.
- Configure pricing and commission policies.
- Activate, cancel, or audit subscriptions.
- View active trips and operational state.
- View financial reports based on stored financial events.
- Review system audit trails.

## Source Of Truth

- Database is the source of truth for business state.
- Admin dashboard is the source of truth for business decisions and pricing policies.
- RPC functions are the source of truth for financial and state-changing operations.
- Mobile app is a client that displays state and sends user intent.
- UI must not contain business-critical financial calculations.

## Core Operating Model

1. Admin defines pricing and operational policies.
2. Admin or driver defines routes and route stops.
3. Student requests a subscription.
4. Driver or admin approves the relationship.
5. Subscription is activated through a transactional RPC.
6. Driver starts an active trip.
7. GPS is used only during active trips as a lightweight aid.
8. The system suggests next actions.
9. Driver confirms important events.
10. Student receives updates.
11. Admin monitors and audits.

## Out Of Scope Until Core 1.0 Is Stable

- Multi-plan subscription packages unless explicitly approved and fully documented.
- Full live tracking outside active trips.
- Automatic "picked up" without driver confirmation.
- Payment gateway integrations that are not backed by a complete transaction model.
- Unapproved financial formulas in frontend code.
- Prototype-only mockup apps in production build gates.
- Features without tests, docs, and clear ownership.

## Definition Of Done For Core 1.0

Core 1.0 is done only when:

- Root typecheck passes.
- Mobile typecheck and build pass.
- Admin typecheck and build pass.
- All unit, integration, RLS, and core E2E tests pass.
- No critical business flow depends on mocked tests only.
- Pricing is fully configurable from admin.
- Financial snapshots are stored on subscriptions and financial events.
- Driver trip workload is reduced through route stops and smart suggestions.
- RLS is validated against a real Supabase database.
- Dead code and conflicting legacy flows are removed or isolated.

