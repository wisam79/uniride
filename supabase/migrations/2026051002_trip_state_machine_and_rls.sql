-- UniRide v2: Trip State Machine Validation + Missing RLS Policies

-- 1. Trip Status Transition Validation Function
CREATE OR REPLACE FUNCTION validate_trip_transition(
  p_trip_id UUID,
  p_new_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
  v_valid BOOLEAN;
BEGIN
  SELECT status INTO v_current_status FROM trips WHERE id = p_trip_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  v_valid := CASE v_current_status
    WHEN 'scheduled' THEN p_new_status IN ('driver_waiting', 'cancelled')
    WHEN 'driver_waiting' THEN p_new_status IN ('in_transit', 'cancelled')
    WHEN 'in_transit' THEN p_new_status IN ('completed', 'absent')
    WHEN 'completed' THEN FALSE
    WHEN 'absent' THEN FALSE
    WHEN 'cancelled' THEN FALSE
    ELSE FALSE
  END;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_current_status, p_new_status;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Safe Trip Update Function (enforces state machine + driver ownership)
CREATE OR REPLACE FUNCTION update_trip_status(
  p_trip_id UUID,
  p_new_status TEXT,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_driver_id UUID
) RETURNS void AS $$
DECLARE
  v_trip_driver_id UUID;
BEGIN
  SELECT driver_id INTO v_trip_driver_id FROM trips WHERE id = p_trip_id FOR UPDATE;

  IF v_trip_driver_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF v_trip_driver_id != p_driver_id THEN
    RAISE EXCEPTION 'Unauthorized: not your trip';
  END IF;

  PERFORM validate_trip_transition(p_trip_id, p_new_status);

  UPDATE trips SET
    status = p_new_status,
    last_lat = p_lat,
    last_lng = p_lng,
    started_at = CASE WHEN p_new_status = 'in_transit' AND started_at IS NULL THEN NOW() ELSE started_at END,
    ended_at = CASE WHEN p_new_status IN ('completed', 'absent') THEN NOW() ELSE ended_at END,
    updated_at = NOW()
  WHERE id = p_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Prevent double-booking: check if student already has active subscription for route
CREATE OR REPLACE FUNCTION reserve_seat(p_route_id UUID, p_student_id UUID)
RETURNS UUID AS $$
DECLARE
  v_available_seats INT;
  v_existing_count INT;
  v_subscription_id UUID;
BEGIN
  SELECT available_seats INTO v_available_seats
  FROM routes
  WHERE id = p_route_id AND is_active = true
  FOR UPDATE;

  IF v_available_seats IS NULL THEN
    RAISE EXCEPTION 'Route not found or inactive';
  END IF;

  IF v_available_seats <= 0 THEN
    RAISE EXCEPTION 'No seats available';
  END IF;

  SELECT COUNT(*) INTO v_existing_count
  FROM subscriptions
  WHERE student_id = p_student_id
    AND route_id = p_route_id
    AND status IN ('active', 'pending');

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Already subscribed to this route';
  END IF;

  UPDATE routes
  SET available_seats = available_seats - 1
  WHERE id = p_route_id;

  INSERT INTO subscriptions (student_id, route_id, status, start_date, end_date)
  VALUES (p_student_id, p_route_id, 'active', NOW(), NOW() + INTERVAL '1 month')
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Driver RLS Policies
CREATE POLICY "Drivers: Own profile sees own" ON drivers FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Drivers: Admins see all" ON drivers FOR SELECT
  USING (is_admin());

-- 5. Subscriptions RLS Policies
CREATE POLICY "Subscriptions: Students see own" ON subscriptions FOR SELECT
  USING (student_id = auth.uid());
CREATE POLICY "Subscriptions: Admins see all" ON subscriptions FOR SELECT
  USING (is_admin());
CREATE POLICY "Subscriptions: Driver sees route subscriptions" ON subscriptions FOR SELECT
  USING (route_id IN (SELECT r.id FROM routes r JOIN drivers d ON r.driver_id = d.id WHERE d.user_id = auth.uid()));

-- 6. Trips RLS Policies
CREATE POLICY "Trips: Students see own route trips" ON trips FOR SELECT
  USING (route_id IN (SELECT route_id FROM subscriptions WHERE student_id = auth.uid()));
CREATE POLICY "Trips: Driver sees own trips" ON trips FOR SELECT
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));
CREATE POLICY "Trips: Admins see all" ON trips FOR SELECT
  USING (is_admin());

-- 7. Profiles RLS: Users can update own profile
CREATE POLICY "Profiles: Users update own" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 8. Routes: Admins full access
CREATE POLICY "Routes: Admins manage all" ON routes FOR ALL
  USING (is_admin());

-- 9. Add updated_at column to trips if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 10. Create trips updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_trips_updated_at ON trips;
CREATE TRIGGER set_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
