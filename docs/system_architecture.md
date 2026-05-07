# System Architecture - Smart Transit

> Core 1.0 update: UniRide is no longer defined as manual-only/no-GPS.
> The current product direction is smart driver assistance with lightweight active-trip GPS, admin-managed financial policy, and driver confirmation for sensitive events.
> See:
>
> - [PRODUCT_CORE.md](./PRODUCT_CORE.md)
> - [DECISIONS.md](./DECISIONS.md)
> - [FINANCIAL_POLICY.md](./FINANCIAL_POLICY.md)
> - [SMART_DRIVER_ASSISTANCE.md](./SMART_DRIVER_ASSISTANCE.md)
> - [TECH_DEBT_EXIT_PLAN.md](./TECH_DEBT_EXIT_PLAN.md)

## Overview

Smart Transit is a state-based transportation management system connecting students to educational institutions via driver routes. The system uses manual state updates (no live GPS) with Supabase Realtime for instant notifications.

## Architecture Layers

### 1. Mobile Application (Expo / React Native)

- **Purpose:** Unified student/driver app
- **Tech:** Expo Router, React Context, Supabase JS client
- **Key Features:**
  - Realtime trip status updates via Supabase Realtime subscriptions
  - OTP-based authentication
  - Trip request, accept, cancel, complete flows
  - Push notifications

### 2. Admin Dashboard (Next.js)

- **Purpose:** User management, route management, analytics
- **Tech:** Next.js App Router, Server Actions, Drizzle ORM
- **Key Features:**
  - Create users with auth.users + profiles atomically
  - CRUD for all entities (routes, subscriptions, trips)
  - Repository Pattern for type-safe queries

### 3. Database (PostgreSQL / Supabase)

- **Schema:** Drizzle ORM with TypeScript types
- **Migrations:** Version-controlled SQL in `supabase/migrations/`
- **Security:** Row Level Security (RLS) on all tables
- **Key Tables:**
  - `profiles` - Users with roles (student/driver/admin)
  - `drivers` - Driver profiles with vehicle info
  - `routes` - Driver-defined routes
  - `subscriptions` - Monthly student subscriptions
  - `trips` - Individual ride records
  - `trip_students` - Student-trip junction

### 4. Trip State Machine

- **Implementation:** PostgreSQL RPC function `transition_trip_status()`
- **States:** scheduled → driver_waiting → in_transit → completed
- **Validations:** Driver ownership, allowed transitions, timestamps
- **Realtime:** Students receive instant updates via Supabase Realtime

## Data Flow

### Student Booking

1. Login via OTP → Supabase session
2. Browse available routes (RLS filtered)
3. Create trip (status: scheduled)
4. Realtime subscription listens for status changes
5. Driver updates status → student sees instantly

### Admin User Creation

1. Admin fills form in Next.js dashboard
2. Server Action calls `supabaseAdmin.auth.admin.createUser()`
3. Drizzle inserts profile (+ driver record if applicable)
4. User can immediately log in via OTP

## Security

- **RLS Policies:** Every table has row-level security
- **Auth:** Supabase JWT sessions, service role for admin
- **Concurrency:** Row-level locks, idempotency keys
- **Transactions:** ACID for financial operations

## Testing

- Unit tests (Vitest) for pure functions
- Integration tests for database flows
- Security tests for RLS policies
- Concurrency tests for race conditions
- Performance/load tests

## Deployment

- Mobile: Expo EAS → App Stores
- Web: Vercel (Next.js)
- Database: Supabase
- CI/CD: GitHub Actions
