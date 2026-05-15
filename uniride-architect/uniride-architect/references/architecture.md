# Architecture & Domain Logic

## Monorepo Structure

UniRide v2 is a symmetric monorepo managed by `pnpm` workspaces.

- **`@uniride/core`**: The single source of truth (SSOT). Contains all Zod validation schemas, TypeScript interfaces, and the State Machine logic. This must be the source of truth for both the frontend and backend.
- **`apps/mobile`**: React Native (Expo) app using Zustand for state.
- **`apps/admin`**: Next.js App Router admin dashboard.
- **`supabase/functions`**: Deno Edge Functions that act as secure gateways for complex operations (rate limiting, idempotency) before interacting with the database.

## State Machine Validation

Critical business rules, such as trip state transitions (`scheduled` -> `driver_waiting` -> `in_transit` -> `completed`), must be strictly enforced.
Any changes to the state machine must first be defined in `@uniride/core`'s `ValidTransitions` and then enforced at the database level using PL/pgSQL validation functions to guarantee consistency.

## Strict Type Safety

Strict TypeScript is required.
The use of `any` is strictly prohibited in both the mobile and admin applications.
All input/output validation across all apps and edge functions must utilize Zod schemas from `@uniride/core`. Edge Functions must never rely on manual validation arrays or strings if a core schema exists.
