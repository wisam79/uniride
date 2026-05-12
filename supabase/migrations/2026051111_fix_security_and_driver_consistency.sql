-- UniRide v2 M6: security + identity consistency fixes

-- 0) Data migration: fix existing trips where driver_id was stored as auth.uid()
--    instead of drivers.id. Old create_trip() used auth.uid() directly; new
--    version resolves drivers.id first. Without this, all in-progress trips
--    would fail the driver_id check in update_trip_status / update_trip_location.
UPDATE trips SET driver_id = d.id
FROM drivers d
WHERE trips.driver_id = d.user_id;

-- 1) Lock down profile privilege fields to admin-only updates.
CREATE OR REPLACE FUNCTION enforce_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only admins can change role';
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Only admins can change verification';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_profile_privileged_fields_trigger ON profiles;
CREATE TRIGGER enforce_profile_privileged_fields_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_privileged_fields();

-- 2) Remove admin policies that relied on profiles.role (client-updatable).
DROP POLICY IF EXISTS "Admins can update any subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update any trip" ON trips;
DROP POLICY IF EXISTS "Admins can manage drivers" ON drivers;

CREATE POLICY "Admins can update any subscription"
  ON subscriptions FOR UPDATE
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can update any trip"
  ON trips FOR UPDATE
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can manage drivers"
  ON drivers FOR ALL
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 3) Keep driver identity consistent: trips.driver_id and routes.driver_id use drivers.id.
CREATE OR REPLACE FUNCTION create_trip(p_route_id UUID, p_scheduled_at TIMESTAMPTZ)
RETURNS UUID AS $$
DECLARE
  v_trip_id UUID;
  v_role TEXT;
  v_driver_id UUID;
BEGIN
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_role;
  IF v_role != 'driver' THEN
    RAISE EXCEPTION 'Only drivers can create trips';
  END IF;

  SELECT d.id INTO v_driver_id
  FROM drivers d
  WHERE d.user_id = auth.uid();

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM routes r WHERE r.id = p_route_id AND r.driver_id = v_driver_id
  ) THEN
    RAISE EXCEPTION 'Route not assigned to this driver';
  END IF;

  INSERT INTO trips (route_id, driver_id, status, scheduled_at)
  VALUES (p_route_id, v_driver_id, 'scheduled', p_scheduled_at)
  RETURNING id INTO v_trip_id;

  RETURN v_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Harden activate_license(): avoid duplicate active subs and enforce capacity.
CREATE OR REPLACE FUNCTION activate_license(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_license RECORD;
  v_subscription_id UUID;
  v_role TEXT;
BEGIN
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_role;
  IF v_role != 'student' THEN
    RAISE EXCEPTION 'Only students can activate licenses';
  END IF;

  SELECT * INTO v_license
  FROM licenses
  WHERE code = upper(p_code) AND status = 'active'
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already used license code';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE student_id = auth.uid()
      AND route_id = v_license.route_id
      AND status IN ('active', 'pending')
  ) THEN
    RAISE EXCEPTION 'You already have an active subscription for this route';
  END IF;

  UPDATE routes
  SET available_seats = available_seats - 1
  WHERE id = v_license.route_id
    AND is_active = true
    AND available_seats > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No seats available for this route';
  END IF;

  UPDATE licenses
  SET status = 'used', used_by = auth.uid(), used_at = NOW()
  WHERE id = v_license.id;

  INSERT INTO subscriptions (student_id, route_id, status, start_date, end_date)
  VALUES (
    auth.uid(),
    v_license.route_id,
    'active',
    NOW(),
    NOW() + (v_license.valid_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Fix rating insert: map trips.driver_id (drivers.id) → drivers.user_id for ratings table.
--    ratings.driver_id FK references auth.users(id), not drivers(id), because ratings
--    JOIN on auth.users for display. trips/routes use drivers(id); ratings uses auth.users(id).
CREATE OR REPLACE FUNCTION submit_rating(
  p_trip_id UUID,
  p_rating INT,
  p_comment TEXT
) RETURNS UUID AS $$
DECLARE
  v_trip RECORD;
  v_driver_user_id UUID;
  v_rating_id UUID;
  v_role TEXT;
BEGIN
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_role;
  IF v_role != 'student' THEN
    RAISE EXCEPTION 'Only students can submit ratings';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF v_trip.status != 'completed' THEN
    RAISE EXCEPTION 'You can only rate completed trips';
  END IF;

  SELECT d.user_id INTO v_driver_user_id
  FROM drivers d
  WHERE d.id = v_trip.driver_id;

  IF v_driver_user_id IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found for trip';
  END IF;

  INSERT INTO ratings (trip_id, student_id, driver_id, rating, comment)
  VALUES (p_trip_id, auth.uid(), v_driver_user_id, p_rating, p_comment)
  RETURNING id INTO v_rating_id;

  RETURN v_rating_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
