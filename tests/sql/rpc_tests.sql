-- UniRide SQL RPC Integration Tests
-- Tests verify RPC contracts, not DB implementation details.
-- Run against a test database or via supabase db reset.

-- Setup: Create test users, routes, trips (if not exists)
-- These tests assume the DB schema is already applied.

-- ── Helper macro ────────────────────────────────────────────────
-- \set_role(user_id, 'role')  — set local role var from JWT
-- Note: pgTAP required for formal test runner. These are
-- documented test cases that can be run manually or via
-- supabase functions serve --env-file .env.local

-- ── cancel_subscription tests ──────────────────────────────────

-- TC-01: activate_license → creates subscription + decrements seat
-- Test case (documented — run via admin UI or test script):
--   SELECT activate_license('VALID_CODE', 'student-uuid');
--   ASSERT: subscription created with status='active'
--   ASSERT: routes.available_seats decremented by 1

-- TC-02: activate_license with invalid code → raises exception
--   SELECT activate_license('INVALID', 'student-uuid');
--   ASSERT: error 'License not found or already used'

-- TC-03: activate_license when no seats → raises exception
--   (routes.available_seats = 0)
--   SELECT activate_license('VALID_CODE', 'student-uuid');
--   ASSERT: error 'No seats available'

-- TC-04: cancel_subscription active → cancelled + seat restored
--   SELECT cancel_subscription('subscription-uuid');
--   ASSERT: subscriptions.status = 'cancelled'
--   ASSERT: routes.available_seats incremented by 1

-- TC-05: cancel_subscription already cancelled → raises exception
--   SELECT cancel_subscription('already-cancelled-sub-uuid');
--   ASSERT: error 'Cannot cancel: status is cancelled'

-- TC-06: cancel_subscription not yours → raises exception
--   SELECT cancel_subscription('other-user-sub-uuid');
--   ASSERT: error 'Not your subscription'

-- ── trip state machine tests ────────────────────────────────────

-- TC-07: create_trip as driver → creates trip
--   SELECT create_trip('route-uuid', 'scheduled_timestamp');
--   ASSERT: trips table has new row with status='scheduled'

-- TC-08: create_trip as student → raises exception
--   SELECT create_trip('route-uuid', 'scheduled_timestamp');
--   ASSERT: error 'Only drivers can create trips'

-- TC-09: update_trip_status valid transition → success
--   scheduled → driver_waiting
--   SELECT update_trip_status('trip-uuid', 'driver_waiting', null, null, 'driver-uuid');
--   ASSERT: trips.status = 'driver_waiting'

-- TC-10: update_trip_status invalid transition → raises exception
--   completed → scheduled (not allowed)
--   SELECT update_trip_status('trip-uuid', 'scheduled', null, null, 'driver-uuid');
--   ASSERT: error containing 'Invalid transition'

-- TC-11: update_trip_status without driver_id → raises exception
--   (p_driver_id is now REQUIRED — no DEFAULT NULL)
--   SELECT update_trip_status('trip-uuid', 'driver_waiting', null, null, NULL);
--   ASSERT: error 'invalid input syntax for type uuid'

-- TC-12: admin_cancel_trip as admin → cancelled
--   SELECT admin_cancel_trip('trip-uuid');
--   ASSERT: trips.status = 'cancelled'

-- TC-13: admin_cancel_trip as student → raises exception
--   SELECT admin_cancel_trip('trip-uuid');
--   ASSERT: error 'Admin only'

-- ── ratings tests ───────────────────────────────────────────────

-- TC-14: submit_rating on completed trip → rating created
--   SELECT submit_rating('trip-uuid', 5, 'Great ride!');
--   ASSERT: ratings table has new row

-- TC-15: submit_rating on non-completed trip → raises exception
--   SELECT submit_rating('trip-uuid', 5, null);
--   ASSERT: error 'Trip must be completed to rate'

-- TC-16: submit_rating duplicate → raises exception
--   (student already rated this trip)
--   SELECT submit_rating('trip-uuid', 4, null);
--   ASSERT: error 'already rated'

-- ── rate limiting tests ─────────────────────────────────────────

-- TC-17: check_rate_limit within limit → returns true
--   SELECT check_rate_limit('user-uuid', 'trip_engine', 30, 60);
--   ASSERT: returns true

-- TC-18: check_rate_limit exceeds limit → returns false
--   (called 31+ times in 60 seconds)
--   SELECT check_rate_limit('user-uuid', 'trip_engine', 30, 60);
--   ASSERT: returns false

-- ── get_dashboard_stats tests ───────────────────────────────────

-- TC-19: get_dashboard_stats returns all required fields
--   SELECT * FROM get_dashboard_stats();
--   ASSERT: returns row with total_users, total_drivers, active_routes,
--           active_trips, active_subscriptions, monthly_revenue

-- TC-20: get_driver_balance returns valid balance for driver
--   SELECT * FROM get_driver_balance('driver-uuid');
--   ASSERT: returns total_earned, total_paid, pending_payouts, balance, available_to_withdraw

-- TC-21: get_slow_queries returns data for admin
--   SELECT * FROM get_slow_queries(10);
--   ASSERT: returns max 10 rows

-- TC-22: Sensitive RPCs deny PUBLIC execute
--   SET ROLE anon;
--   SELECT get_dashboard_stats();
--   ASSERT: permission denied for function get_dashboard_stats
--   SELECT get_driver_balance('uuid');
--   ASSERT: permission denied for function get_driver_balance

-- TC-23: ping() → returns without error
--   SELECT ping();
--   ASSERT: returns 1 row, no error