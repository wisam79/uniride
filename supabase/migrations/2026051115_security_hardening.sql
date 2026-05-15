-- UniRide: Security hardening & missing grants
-- Fixes discovered during audit:
--   1. get_analytics_summary missing GRANT EXECUTE for authenticated users
--   2. get_driver_avg_rating missing GRANT EXECUTE
--   3. Explicit REVOKE of old 3-param check_rate_limit to avoid ambiguity
--   4. Ensure reserve_seat is fully dropped (belt-and-suspenders)

-- ════════════════════════════════════════════════
-- 1. Grant execute on analytics RPC to authenticated users
--    (admin-only check is enforced inside the function body)
-- ════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION get_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ════════════════════════════════════════════════
-- 2. Grant execute on driver avg rating RPC
-- ════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION get_driver_avg_rating(UUID) TO authenticated;

-- ════════════════════════════════════════════════
-- 3. Drop the old 3-param check_rate_limit signature
--    (replaced by 4-param version in 2026051106)
--    Prevents accidental calls to the wrong overload.
-- ════════════════════════════════════════════════
DROP FUNCTION IF EXISTS check_rate_limit(TEXT, INT, INT);

-- ════════════════════════════════════════════════
-- 4. Belt-and-suspenders: ensure reserve_seat is gone
--    (was dropped in 2026051108 but guard against re-creation)
-- ════════════════════════════════════════════════
DROP FUNCTION IF EXISTS reserve_seat(UUID, UUID);

-- ════════════════════════════════════════════════
-- 5. Grant execute on cancel_subscription (already granted
--    in 2026051114 but idempotent — safe to repeat)
-- ════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION cancel_subscription(UUID) TO authenticated;

-- ════════════════════════════════════════════════
-- 6. Revoke public execute on sensitive RPCs
--    (should only be callable by authenticated users)
-- ════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION get_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
REVOKE EXECUTE ON FUNCTION get_dashboard_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION cancel_subscription(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION create_license_batch(UUID, TEXT, INT, NUMERIC, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION activate_license(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION submit_rating(UUID, INT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION create_trip(UUID, TIMESTAMPTZ) FROM anon;
