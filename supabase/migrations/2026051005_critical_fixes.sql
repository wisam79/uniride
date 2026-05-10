-- UniRide v2 Critical Fixes Migration
-- Run after 2026051004_phase0_fixes.sql

-- ============================================================
-- F1: Fix get_my_role() - Remove user_metadata fallback
-- user_metadata is client-writable = privilege escalation risk
-- Only app_metadata should be used for role determination
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'student'
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- F2: Create dashboard stats RPC to avoid loading all records
-- Replaces pageSize:0 queries in admin dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats() RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'total_drivers', (SELECT count(*) FROM drivers),
    'total_routes', (SELECT count(*) FROM routes),
    'active_routes', (SELECT count(*) FROM routes WHERE is_active = true),
    'total_trips', (SELECT count(*) FROM trips),
    'active_trips', (SELECT count(*) FROM trips WHERE status IN ('driver_waiting', 'in_transit')),
    'total_subscriptions', (SELECT count(*) FROM subscriptions),
    'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'active'),
    'monthly_revenue', (
      SELECT COALESCE(SUM(r.price), 0)
      FROM subscriptions s
      JOIN routes r ON r.id = s.route_id
      WHERE s.status = 'active'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- F3: Create ping RPC for network status check
-- Avoids false negatives from RLS-blocked queries
-- ============================================================
CREATE OR REPLACE FUNCTION ping() RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- F4: Add missing indexes for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_route_status ON subscriptions(route_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_route_status ON trips(route_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_scheduled ON trips(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_trips_driver_status ON trips(driver_id, status);

-- ============================================================
-- F5: Fix update_trip_location - verify trip is active
-- Prevents updating location for completed/cancelled trips
-- ============================================================
CREATE OR REPLACE FUNCTION update_trip_location(
  p_trip_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_driver_id UUID;
  v_status TEXT;
BEGIN
  -- Get driver ID from auth
  SELECT d.id INTO v_driver_id
  FROM drivers d
  WHERE d.user_id = auth.uid();

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found';
  END IF;

  -- Get current trip status
  SELECT status INTO v_status
  FROM trips
  WHERE id = p_trip_id AND driver_id = v_driver_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Trip not found or not assigned to you';
  END IF;

  -- Only allow updates for active trips
  IF v_status NOT IN ('driver_waiting', 'in_transit') THEN
    RAISE EXCEPTION 'Cannot update location for trip with status: %', v_status;
  END IF;

  -- Update location
  UPDATE trips
  SET last_lat = p_lat, last_lng = p_lng, updated_at = NOW()
  WHERE id = p_trip_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- F6: DB-based rate limiting for edge functions
-- Uses Supabase auth.uid() to track per-user limits
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action, window_start);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_action TEXT,
  p_limit INT,
  p_window_seconds INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Clean old entries first
  DELETE FROM rate_limits
  WHERE user_id = auth.uid()
    AND action = p_action
    AND window_start < v_window_start;

  -- Count recent requests
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM rate_limits
  WHERE user_id = auth.uid()
    AND action = p_action
    AND window_start >= v_window_start;

  IF v_count >= p_limit THEN
    RETURN FALSE; -- Rate limit exceeded
  END IF;

  -- Insert new request
  INSERT INTO rate_limits (user_id, action, window_start, request_count)
  VALUES (auth.uid(), p_action, NOW(), 1)
  ON CONFLICT (id) DO UPDATE SET
    request_count = rate_limits.request_count + 1;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- F7: Add missing RLS policies for admin operations
-- ============================================================

-- Allow admins to UPDATE any subscription status
CREATE POLICY "Admins can update any subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  ));

-- Allow admins to UPDATE any trip status
CREATE POLICY "Admins can update any trip"
  ON trips FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  ));

-- Allow admins to INSERT/UPDATE drivers
CREATE POLICY "Admins can manage drivers"
  ON drivers FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  ));

-- Allow students to INSERT their own profile (self-registration)
CREATE POLICY "Students can create own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- F8: Fix seed idempotency - handle conflicts gracefully
-- ============================================================
CREATE OR REPLACE FUNCTION seed_safe_insert(
  table_name TEXT,
  data JSONB
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'INSERT INTO %I SELECT * FROM jsonb_to_record($1) AS t',
    table_name
  ) USING data
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- F9: Audit log improvements - index on resource_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);