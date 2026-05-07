# System Architecture

> Current direction: this document is now supplemented by the Core 1.0 decision set.
> If any older statement here conflicts with the documents below, the newer decision documents win:
>
> - [PRODUCT_CORE.md](./PRODUCT_CORE.md)
> - [DECISIONS.md](./DECISIONS.md)
> - [FINANCIAL_POLICY.md](./FINANCIAL_POLICY.md)
> - [SMART_DRIVER_ASSISTANCE.md](./SMART_DRIVER_ASSISTANCE.md)
> - [TECH_DEBT_EXIT_PLAN.md](./TECH_DEBT_EXIT_PLAN.md)

UniRide uses a modern **PNPM Monorepo** architecture to share types, schemas, and logic across the frontend and backend efficiently.

## 📂 Workspace Structure

```text
uniride/
├── artifacts/
│   ├── admin-dashboard/    # Next.js web admin dashboard
│   ├── mobile/             # Expo / React Native mobile application
│   └── mockup-sandbox/     # Vite + React sandbox for UI prototyping
├── lib/
│   └── db/                 # Drizzle ORM schema, migrations, and DB client
├── scripts/                # Shared bash/node scripts for DB seeding, CI/CD
└── tests/                  # Global test suites (Unit, Integration, E2E, Security)
```

## 🧩 Core Components

### 1. Mobile App (`@workspace/mobile`)

- **Framework:** Expo (React Native).
- **State Management:** React Context (Auth, Trip, Driver, Subscription, Notification contexts).
- **Data Access:** Direct Supabase client (`@supabase/supabase-js`) with Realtime subscriptions for live trip updates.
- **Routing:** Expo Router.

### 2. Admin Dashboard (`@workspace/admin-dashboard`)

- **Framework:** Next.js (App Router) with TypeScript.
- **State Management:** Server-side data fetching with Next.js Server Actions.
- **Authentication:** Supabase Admin API (`supabase.auth.admin`) for creating users with auth.users + profiles atomically.
- **Database Access:** Drizzle ORM via `@workspace/db` with Repository Pattern.

### 3. Database Layer (`@workspace/db`)

- **ORM:** Drizzle ORM.
- **Database:** PostgreSQL (Supabase).
- **Migrations:** Drizzle-generated SQL migrations in `lib/db/migrations/` + consolidated Supabase migrations in `supabase/migrations/`.
- **Key Tables:**
  - `profiles`: Users with roles (student, driver, admin, unassigned).
  - `drivers`: Driver profiles with vehicle info and capacity.
  - `routes`: Driver-defined routes with seat availability.
  - `subscriptions`: Student-driver monthly subscriptions with payment tracking.
  - `trips`: Individual ride records with state machine (`scheduled` → `driver_waiting` → `in_transit` → `completed`).
  - `trip_students`: Junction table linking students to trips.
- **Security:** Row Level Security (RLS) policies on all tables. Students see only their data; drivers see only their routes/trips.

### 4. Supabase Backend

- **Authentication:** Supabase Auth with OTP (email/phone).
- **Realtime:** PostgreSQL change streams for live trip status updates.
- **Edge Functions:** Deployable serverless functions.
- **Storage:** File storage for documents/images.

## 🔄 Data Flow

### Student Booking Flow

1. **Authentication:** Mobile app uses Supabase client with OTP login.
2. **Browse Routes:** Student queries available routes via Supabase client with RLS filtering.
3. **Create Trip:** Student creates trip record (status: `scheduled`).
4. **Live Updates:** Supabase Realtime channel (`student-trips-{id}`) pushes status changes to student app instantly.
5. **Trip Completion:** Driver triggers `transition_trip_status` RPC to advance state; student sees updates in real-time.

### Admin User Creation Flow

1. **Server Action:** Admin dashboard calls `createUser` Server Action.
2. **Auth User:** `supabaseAdmin.auth.admin.createUser()` creates auth record.
3. **Profile Record:** Drizzle inserts into `profiles` (and `drivers` if applicable) atomically.
4. **Login Ready:** New user can immediately log in via OTP.

### Trip State Machine

- Implemented as PostgreSQL RPC function `transition_trip_status(trip_id, new_status)`.
- Enforces valid transitions:
  - `scheduled` → `driver_waiting` | `in_transit` | `cancelled`
  - `driver_waiting` → `in_transit` | `absent` | `cancelled`
  - `in_transit` → `completed`
- Validates driver ownership via `auth.uid()`.
- Auto-sets `started_at` / `ended_at` timestamps.

## 🔒 Security Model

### Row Level Security (RLS)

- **Profiles:** Users read/update own; admins read all.
- **Trips:** Drivers read own; students read via `trip_students` junction.
- **Subscriptions:** Students read own; drivers read linked subscriptions.
- **All tables:** RLS enabled with granular policies.

### Authentication

- Supabase JWT-based sessions.
- Admin operations use service role key (server-side only).
- OTP-based login for students/drivers.

### Concurrency Control

- PostgreSQL `FOR UPDATE` row-level locking for seat booking.
- Idempotency keys on subscriptions to prevent double-charging.
- ACID transactions for financial operations.

## 🧪 Testing Strategy

- **Unit Tests:** Vitest for pure functions, API wrappers, utilities.
- **Integration Tests:** Database transactions, booking flows.
- **Security Tests:** RLS policy validation, SQL injection prevention.
- **Concurrency Tests:** Race condition detection, deadlock prevention.
- **Performance Tests:** Load testing with realistic data volumes.

## 📦 Deployment

- **Mobile:** Expo EAS Build → iOS/Android app stores.
- **Web Dashboard:** Vercel (Next.js).
- **Database:** Supabase (PostgreSQL + Auth + Storage + Edge Functions).
- **CI/CD:** GitHub Actions with type checking, linting, test suite.
