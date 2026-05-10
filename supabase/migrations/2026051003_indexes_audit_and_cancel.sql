-- UniRide v2: Production Performance Indexes + Audit Logging

-- 1. Foreign key indexes
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_routes_driver_id ON routes(driver_id);
CREATE INDEX idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX idx_subscriptions_route_id ON subscriptions(route_id);
CREATE INDEX idx_trips_route_id ON trips(route_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);

-- 2. Composite indexes for common queries
CREATE INDEX idx_routes_active_seats ON routes(is_active, available_seats) WHERE is_active = true;
CREATE INDEX idx_subscriptions_student_active ON subscriptions(student_id, status) WHERE status IN ('active', 'pending');
CREATE INDEX idx_trips_active ON trips(status) WHERE status IN ('driver_waiting', 'in_transit');

-- 3. Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Audit log indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 5. Audit log RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit: Admins see all" ON audit_logs FOR SELECT USING (is_admin());

-- 6. Helper function to log audit events
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT,
  p_resource_id UUID,
  p_details JSONB
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (p_user_id, p_action, p_resource, p_resource_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Subscription cancellation RLS
CREATE POLICY "Subscriptions: Students cancel own active" ON subscriptions FOR UPDATE
  USING (student_id = auth.uid() AND status IN ('active', 'pending'))
  WITH CHECK (student_id = auth.uid() AND status = 'cancelled');
