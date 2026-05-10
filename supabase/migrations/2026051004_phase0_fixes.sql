-- UniRide Phase 0: Fix critical and high-priority issues
-- C2: GPS location-only RPC
-- C3: Subscription cancel returns seat (trigger)
-- H2: JWT role from app_metadata instead of user_metadata
-- M6: pg_cron for subscription expiry
-- M7: Profile update syncs to auth metadata (trigger)
-- M8: CHECK constraint: available_seats <= capacity
-- L8: ON DELETE CASCADE for foreign keys

-- ============================================================
-- C2: Separate RPC for GPS location updates (no status change)
-- This prevents the state machine from rejecting repeated
-- in_transit -> in_transit transitions during GPS tracking.
-- ============================================================
CREATE OR REPLACE FUNCTION update_trip_location(
  p_trip_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC
) RETURNS void AS $$
DECLARE
  v_trip_driver_id UUID;
  v_caller_driver_id UUID;
BEGIN
  SELECT driver_id INTO v_caller_driver_id FROM drivers WHERE user_id = auth.uid();

  IF v_caller_driver_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: not a driver';
  END IF;

  SELECT driver_id INTO v_trip_driver_id FROM trips WHERE id = p_trip_id;

  IF v_trip_driver_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF v_trip_driver_id != v_caller_driver_id THEN
    RAISE EXCEPTION 'Unauthorized: not your trip';
  END IF;

  UPDATE trips SET
    last_lat = p_lat,
    last_lng = p_lng,
    updated_at = NOW()
  WHERE id = p_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- C3: Trigger to return seat when subscription is cancelled
-- Without this, cancelled subscriptions permanently consume seats.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('active', 'pending')
     AND NEW.status IN ('cancelled', 'expired') THEN
    UPDATE routes SET available_seats = available_seats + 1
    WHERE id = OLD.route_id;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.status IN ('active', 'pending') THEN
    UPDATE routes SET available_seats = available_seats + 1
    WHERE id = OLD.route_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_cancel ON subscriptions;
CREATE TRIGGER on_subscription_cancel
  AFTER UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_subscription_change();

-- ============================================================
-- H2: Fix get_my_role() to use app_metadata (not user_metadata)
-- user_metadata is writable by the client via SDK = privilege escalation.
-- app_metadata is only writable by admin API = secure.
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    'student'
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- M6: Auto-expire subscriptions using pg_cron
-- Runs every hour, sets status='expired' for past-end-date active subs
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'expire-subscriptions',
  '0 * * * *',
  $$
  UPDATE subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND end_date < NOW();
  $$
);

-- ============================================================
-- M7: Trigger to sync profile updates back to auth.users metadata
-- When profiles.full_name is updated, also update user_metadata.full_name
-- so that session.user.user_metadata stays consistent.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_profile_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}') || jsonb_build_object('full_name', NEW.full_name)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_to_auth_metadata();

-- ============================================================
-- M8: CHECK constraint ensures available_seats never exceeds capacity
-- Prevents data corruption from admin errors or bugs.
-- ============================================================
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_available_seats_check;
ALTER TABLE routes ADD CONSTRAINT routes_available_seats_check
  CHECK (available_seats >= 0 AND available_seats <= capacity);

-- ============================================================
-- L8: Add ON DELETE CASCADE to foreign keys missing it
-- Without this, deleting a parent row fails if child rows exist.
-- ============================================================

-- subscriptions.student_id -> profiles.id (ON DELETE CASCADE)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_student_id_fkey;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- subscriptions.route_id -> routes.id (ON DELETE CASCADE)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_route_id_fkey;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_route_id_fkey
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE;

-- trips.route_id -> routes.id (ON DELETE CASCADE)
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_route_id_fkey;
ALTER TABLE trips ADD CONSTRAINT trips_route_id_fkey
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE;

-- trips.driver_id -> drivers.id (ON DELETE CASCADE)
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;
ALTER TABLE trips ADD CONSTRAINT trips_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE;

-- routes.driver_id -> drivers.id (ON DELETE CASCADE)
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_driver_id_fkey;
ALTER TABLE routes ADD CONSTRAINT routes_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE;

-- audit_logs.user_id -> profiles.id (ON DELETE SET NULL)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
