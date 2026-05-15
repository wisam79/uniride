-- Create driver_payouts table
CREATE TABLE IF NOT EXISTS driver_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  reference_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver_id ON driver_payouts(driver_id);

-- RLS
ALTER TABLE driver_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own payouts"
  ON driver_payouts FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can request payouts"
  ON driver_payouts FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view and manage all payouts"
  ON driver_payouts
  USING (is_admin());

-- RPC to calculate driver earnings
CREATE OR REPLACE FUNCTION get_driver_balance(p_driver_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_total_earned NUMERIC(12, 2) := 0;
  v_total_paid NUMERIC(12, 2) := 0;
  v_pending_payouts NUMERIC(12, 2) := 0;
  v_balance NUMERIC(12, 2) := 0;
BEGIN
  -- Calculate total earned from subscriptions to driver's routes
  SELECT COALESCE(SUM(r.price), 0)
  INTO v_total_earned
  FROM subscriptions s
  JOIN routes r ON s.route_id = r.id
  WHERE r.driver_id = p_driver_id
  AND s.status IN ('active', 'expired');

  -- Calculate total completed payouts
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM driver_payouts
  WHERE driver_id = p_driver_id
  AND status = 'completed';

  -- Calculate total pending payouts
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_payouts
  FROM driver_payouts
  WHERE driver_id = p_driver_id
  AND status = 'pending';

  v_balance := v_total_earned - v_total_paid;

  RETURN json_build_object(
    'total_earned', v_total_earned,
    'total_paid', v_total_paid,
    'pending_payouts', v_pending_payouts,
    'balance', v_balance,
    'available_to_withdraw', v_balance - v_pending_payouts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_driver_balance(UUID) TO authenticated;
