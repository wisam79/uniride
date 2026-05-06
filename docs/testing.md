# Testing Strategy

UniRide employs a rigorous 10-layer testing strategy using **Vitest** to ensure extreme reliability, especially regarding database concurrency and security.

## 🏃 Running Tests

```bash
# Run all tests
pnpm test

# Run specific suites
pnpm run test:unit
pnpm run test:security
pnpm run test:concurrency
pnpm run test:integration
pnpm run test:edge-cases
pnpm run test:performance
```

## 🧪 Testing Layers Overview

1. **Logic Unit Tests (`tests/unit/`)**
   - Validates business logic without hitting the DB.
   - Validates schemas, fare calculations, and AppContext React logic.
   - Tests utility functions like `formatIQD` and WhatsApp API wrappers.

2. **Constraint Validation Tests (`lib/db/tests/`)**
   - Tests database level constraints (e.g., rejecting negative seats, missing names, or duplicate phone numbers).

3. **RLS Security Tests (`tests/security/`)**
   - Simulates Row Level Security (RLS).
   - Ensures students cannot view other students' subscriptions and drivers can only modify their own routes.
   - Verifies JWT middleware behavior.

4. **Concurrency & Race Conditions (`tests/concurrency/`)**
   - Critical tests that bombard the database with simultaneous requests.
   - Verifies that `FOR UPDATE` row-level locks successfully prevent overbooking seats on a route.

5. **Idempotency Tests**
   - Ensures that rapid, duplicated requests to payment or subscription endpoints are safely rejected or merged.

6. **Event Integration Tests**
   - Tests database triggers and multi-table updates (e.g., completing a trip automatically increments `tripsUsed` on a subscription).

7. **Edge Case Tests (`tests/edge-cases/`)**
   - Tests system resilience against bad data (invalid lat/long coordinates, extreme string lengths, booking 0 seats).

8. **Offline Sync Tests**
   - Validates conflict resolution strategies when mobile apps come back online after losing connection.

9. **Performance Load Tests (`tests/performance/`)**
   - Uses `performance.now()` to ensure heavy operations (generating 1000 keys, aggregating 10,000 payload items) execute in `<100ms`.

10. **End-to-End Workflow Tests (`tests/integration/`)**
    - Simulates the entire lifecycle: A driver creates a route -> a student subscribes -> a trip is requested -> the trip is completed.