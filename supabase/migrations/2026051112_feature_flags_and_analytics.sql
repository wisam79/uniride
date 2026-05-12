-- UniRide v2 M6: Feature Flags + Analytics RPC
-- Migration: 2026051112_feature_flags_and_analytics.sql

-- ════════════════════════════════════════════════
-- 1. Feature Flags table
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read flags (needed by mobile app at startup)
CREATE POLICY "Everyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Only admins can manage flags
CREATE POLICY "Admins can manage feature flags"
  ON feature_flags FOR ALL
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Seed default flags
INSERT INTO feature_flags (name, enabled, description) VALUES
  ('realtime_tracking',  true,  'Enable real-time GPS tracking for drivers'),
  ('push_notifications', true,  'Enable Expo push notifications'),
  ('offline_mode',       true,  'Enable offline subscription cache'),
  ('ratings_system',     true,  'Enable post-trip ratings'),
  ('zaincash_payment',   false, 'Enable ZainCash payment gateway (requires merchant credentials)')
ON CONFLICT (name) DO NOTHING;

-- ════════════════════════════════════════════════
-- 2. Analytics RPC
-- ════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Only admins may call this
  IF auth.jwt() -> 'app_metadata' ->> 'role' != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_trips', (
      SELECT COUNT(*) FROM trips
      WHERE created_at BETWEEN p_start_date AND p_end_date
    ),
    'completed_trips', (
      SELECT COUNT(*) FROM trips
      WHERE status = 'completed'
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    'cancelled_trips', (
      SELECT COUNT(*) FROM trips
      WHERE status = 'cancelled'
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(r.price), 0)
      FROM subscriptions s
      JOIN routes r ON s.route_id = r.id
      WHERE s.created_at BETWEEN p_start_date AND p_end_date
        AND s.status = 'active'
    ),
    'active_students', (
      SELECT COUNT(DISTINCT student_id)
      FROM subscriptions
      WHERE status = 'active'
    ),
    'active_drivers', (
      SELECT COUNT(*)
      FROM drivers d
      JOIN profiles p ON d.user_id = p.id
      WHERE p.is_verified = true
    ),
    'avg_rating', (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM ratings
      WHERE created_at BETWEEN p_start_date AND p_end_date
    ),
    'trips_by_status', (
      SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
      FROM (
        SELECT status, COUNT(*) AS cnt
        FROM trips
        WHERE created_at BETWEEN p_start_date AND p_end_date
        GROUP BY status
      ) t
    ),
    'top_routes', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          r.title,
          COUNT(s.id)          AS subscriptions,
          r.price,
          COUNT(s.id) * r.price AS revenue
        FROM routes r
        LEFT JOIN subscriptions s
          ON r.id = s.route_id
          AND s.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY r.id, r.title, r.price
        ORDER BY subscriptions DESC
        LIMIT 10
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
