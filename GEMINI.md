# UniRide (يونيرايد) - Workspace Instructions

## Project Overview
UniRide is a platform designed to facilitate transportation for university students in Iraq, connecting students with verified drivers, managing subscriptions, and handling daily routes. It operates as a state-based, manually updated transportation management ecosystem (NO live GPS tracking).

**Tech Stack:**
- **Workspace:** PNPM Monorepo
- **Mobile App:** Expo / React Native, Supabase SDK (Unified app for Students & Drivers)
- **Admin Dashboard:** Next.js / React
- **Backend & Database:** Supabase (PostgreSQL), Drizzle ORM

*Note: The legacy `api-server` has been phased out in favor of a unified architecture under Supabase.*

## Building and Running

**Prerequisites:** Node.js (v20+), PNPM (v8+), Expo CLI

**Install Dependencies:**
```bash
pnpm install
```

**Run Mobile App:**
```bash
cd artifacts/mobile
pnpm run dev
```

**Run Admin Dashboard:**
```bash
cd artifacts/admin-dashboard
pnpm run dev
```

**Database Migrations (Drizzle):**
```bash
cd lib/db
pnpm run push
```

## Testing Strategy
The project uses **Vitest** for a rigorous 10-layer testing strategy covering unit, security, concurrency, edge-cases, performance, and integration tests.

```bash
# Run all tests from the root
pnpm test

# Run specific suites
pnpm run test:unit
pnpm run test:security
pnpm run test:concurrency
pnpm run test:integration
pnpm run test:edge-cases
pnpm run test:performance
```

## Development Conventions & Strict Rules

1. **Test-Driven Development (TDD) is MANDATORY:**
   - Write comprehensive tests BEFORE implementing any feature.
   - **CRITICAL STOP:** NEVER write new code or proceed to the next task if the current test suite fails. Fix tests first.

2. **Documentation & Memory:**
   - Maintain the `docs/` directory. Update `docs/architecture.md` or `docs/changelog.md` before writing code for new features or schema changes.
   - Keep `AGENTS.md` (or a linked `MEMORY.md`) updated with new context or resolutions to prevent context loss.

3. **Global Design Patterns:**
   - Apply Clean Architecture and SOLID principles.
   - Use the **Repository Pattern** for all database interactions.
   - Keep components modular, decoupled, and reusable.
   - Do not invent business rules. Ask for clarification if ambiguous.

4. **Financial Engine & Mathematical Accuracy:**
   - **Integer Arithmetic:** Store all monetary values in the database as integers (smallest denomination) to avoid floating-point inaccuracies.
   - **ACID Transactions:** Financial updates MUST use strict database transactions (e.g., PostgreSQL RPC). Rollback entirely on failure.
   - Write explicit failure tests for concurrent transactions.

5. **State Management Mechanism:**
   - Relies on **Manual State Updates** triggered by the driver.
   - Transitions: `scheduled` -> `driver_waiting` -> `in_transit` -> `completed`.
   - The Student app listens to state changes via Supabase Realtime or Polling.

6. **Database Schema Principles:**
   - Enforce strict Foreign Key constraints and Cascade rules.
   - Use Row Level Security (RLS) rigorously.
   - **Soft Deletes:** Never permanently delete users or financial records. Use an `is_deleted` or `status` boolean.
