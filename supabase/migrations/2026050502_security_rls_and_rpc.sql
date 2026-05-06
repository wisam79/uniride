-- Migration: Security - RLS Policies and RPC Functions
-- Generated: 2026-05-05

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_driver_id ON subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_students_trip_id ON trip_students(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_students_student_id ON trip_students(student_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================================
-- RLS POLICIES - PROFILES
-- ============================================================

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS POLICIES - DRIVERS
-- ============================================================

CREATE POLICY "Drivers can view own driver record" ON drivers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own driver record" ON drivers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all drivers" ON drivers
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS POLICIES - ROUTES
-- ============================================================

CREATE POLICY "Drivers can view own routes" ON routes
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can create routes" ON routes
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can update own routes" ON routes
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Students can view available routes" ON routes
  FOR SELECT USING (is_active = true AND available_seats > 0
    AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage all routes" ON routes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS POLICIES - SUBSCRIPTIONS
-- ============================================================

CREATE POLICY "Students can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can create subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = (SELECT id FROM profiles WHERE id = student_id));

CREATE POLICY "Students can update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = (SELECT id FROM profiles WHERE id = student_id));

CREATE POLICY "Drivers can view subscriptions for their routes" ON subscriptions
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Admins can manage all subscriptions" ON subscriptions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS POLICIES - TRIPS
-- ============================================================

CREATE POLICY "Drivers can view own trips" ON trips
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can create trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Students can view trips for their subscriptions" ON trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE subscriptions.id = trips.subscription_id 
      AND subscriptions.student_id = auth.uid()
    )
  );

-- ============================================================
-- RLS POLICIES - TRIP_STUDENTS
-- ============================================================

CREATE POLICY "Students can view own trip details" ON trip_students
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Drivers can view trip details for their trips" ON trip_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_students.trip_id 
      AND trips.driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- RLS POLICIES - TRIP_STUDENTS
-- ============================================================

CREATE POLICY "Students can read own trip details" ON trip_students
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Drivers can read trip details for their trips" ON trip_students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE id = trip_students.trip_id AND driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Drivers can update trip_students for their trips" ON trip_students
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM trips WHERE id = trip_students.trip_id AND driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Students can update own trip status" ON trip_students
  FOR UPDATE USING (auth.uid() = student_id);

-- ============================================================
-- RLS POLICIES - REVIEWS, NOTIFICATIONS, OTHERS
-- ============================================================

CREATE POLICY "Users can view reviews" ON reviews
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = (SELECT id FROM profiles WHERE id = from_user_id));

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own OTP codes" ON otp_codes
  FOR SELECT USING (auth.uid() = (SELECT id FROM profiles WHERE phone = otp_codes.phone));

CREATE POLICY "Users can insert own OTP" ON otp_codes
  FOR INSERT WITH CHECK (auth.uid() = (SELECT id FROM profiles WHERE phone = otp_codes.phone));

-- ============================================================
-- TRIP STATE MACHINE RPC FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION transition_trip_status(target_trip_id UUID, new_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_status TEXT;
  caller_id UUID;
  caller_driver_id UUID;
  trip_driver_id UUID;
BEGIN
  -- Get caller
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get driver_id for caller
  SELECT id INTO caller_driver_id FROM drivers WHERE user_id = caller_id;

  -- Get current trip state
  SELECT status, driver_id INTO current_status, trip_driver_id 
  FROM trips 
  WHERE id = target_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  -- Verify caller owns the trip
  IF caller_driver_id IS NULL OR caller_driver_id != trip_driver_id THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this trip';
  END IF;

  -- Validate allowed transitions
  IF current_status = 'scheduled' THEN
    IF new_status NOT IN ('driver_waiting', 'in_transit', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from scheduled to %', new_status;
    END IF;
  ELSIF current_status = 'driver_waiting' THEN
    IF new_status NOT IN ('in_transit', 'absent', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from driver_waiting to %', new_status;
    END IF;
  ELSIF current_status = 'in_transit' THEN
    IF new_status NOT IN ('completed') THEN
      RAISE EXCEPTION 'Invalid transition from in_transit to %', new_status;
    END IF;
  ELSE
    RAISE EXCEPTION 'Trip is in terminal state % and cannot be transitioned', current_status;
  END IF;

  -- Apply update with timestamps
  IF new_status = 'in_transit' THEN
    UPDATE trips SET status = new_status, started_at = NOW() WHERE id = target_trip_id;
  ELSIF new_status = 'completed' THEN
    UPDATE trips SET status = new_status, ended_at = NOW() WHERE id = target_trip_id;
  ELSE
    UPDATE trips SET status = new_status WHERE id = target_trip_id;
  END IF;
END;
$$;