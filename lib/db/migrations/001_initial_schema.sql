-- Migration: Initial schema with RLS policies
-- Generated: 2026-05-04

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies for drivers
CREATE POLICY "Drivers can view own driver record" ON drivers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own driver record" ON drivers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all drivers" ON drivers
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policies for routes
CREATE POLICY "Drivers can view own routes" ON routes
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can create routes" ON routes
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can update own routes" ON routes
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Students can view available routes" ON routes
  FOR SELECT USING (is_active = true AND available_seats > 0);

CREATE POLICY "Admins can manage all routes" ON routes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policies for subscriptions
CREATE POLICY "Students can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = student_id));

CREATE POLICY "Students can create subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = student_id));

CREATE POLICY "Students can update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = student_id));

CREATE POLICY "Drivers can view subscriptions for their routes" ON subscriptions
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Admins can manage all subscriptions" ON subscriptions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policies for trips
CREATE POLICY "Drivers can view own trips" ON trips
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can create trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Students can view trips for their subscriptions" ON trips
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = (SELECT student_id FROM subscriptions WHERE id = subscription_id)));

-- Policies for driver_absences
CREATE POLICY "Drivers can view own absences" ON driver_absences
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can create own absences" ON driver_absences
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

-- Policies for cards
CREATE POLICY "Drivers can view own cards" ON cards
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Admins can manage cards" ON cards
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policies for otp_codes
CREATE POLICY "Users can view own OTP codes" ON otp_codes
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE phone = otp_codes.phone));

CREATE POLICY "Users can create OTP codes" ON otp_codes
  FOR INSERT WITH CHECK (true);

-- Policies for reviews
CREATE POLICY "Users can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = from_user_id));

-- Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for student_preferences
CREATE POLICY "Students can view own preferences" ON student_preferences
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = student_id));

CREATE POLICY "Students can update own preferences" ON student_preferences
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = student_id))
  ON UPDATE USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = student_id));

-- Policies for subscription_requests
CREATE POLICY "Students can view own requests" ON subscription_requests
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = student_id));

CREATE POLICY "Students can create requests" ON subscription_requests
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = student_id));

CREATE POLICY "Drivers can view requests for their routes" ON subscription_requests
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

CREATE POLICY "Drivers can update requests" ON subscription_requests
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_driver_id ON subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
