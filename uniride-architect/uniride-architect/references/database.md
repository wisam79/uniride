# Database Integrity & Security

The PostgreSQL database in Supabase is treated as the Logic Engine.

## Concurrency & Locking

High-integrity operations (e.g., seat booking) must be offloaded to PostgreSQL RPCs using pessimistic locking (`FOR UPDATE`).
Always ensure that related tables (e.g., `subscriptions`) have appropriate UNIQUE constraints to prevent duplicate pending/active states, preventing race conditions from simultaneous requests.

## Triggers vs. RPC Logic

Avoid "Double Increment" logic bugs. If a trigger (e.g., `AFTER UPDATE`) automatically adjusts capacities or counts (such as returning `available_seats` when a subscription is cancelled), DO NOT manually apply the same update within an RPC that performs the status change. Choose one pattern and document it clearly.

## Row Level Security (RLS) & Security Definer

- Heavy reliance on RLS driven by custom JWT claims stored in `app_metadata` (e.g., role checks).
- When creating `SECURITY DEFINER` functions, ALWAYS explicitly revoke execute permissions from `PUBLIC` to prevent RLS bypasses:
  ```sql
  REVOKE EXECUTE ON FUNCTION my_rpc FROM public;
  GRANT EXECUTE ON FUNCTION my_rpc TO authenticated;
  ```
- Beware of `DEFAULT NULL` parameters in authorization checks within `SECURITY DEFINER` functions, as they can be omitted by attackers to bypass validation logic.

## Driver/User Identity

Ensure consistency with Foreign Keys.
`trips` and `routes` use `drivers.id`. When joining or verifying against `auth.users`, ensure the mapping logic is robust and does not leak `auth.users.id` where `drivers.id` is expected.
