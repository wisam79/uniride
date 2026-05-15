-- ════════════════════════════════════════════════════════════════
-- UniRide: Secure Driver Payouts
-- ════════════════════════════════════════════════════════════════

-- 1. Create request_payout RPC for drivers
CREATE OR REPLACE FUNCTION request_payout(p_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_my_driver_id UUID;
  v_balance RECORD;
  v_payout_id UUID;
BEGIN
  -- Verify driver
  SELECT id INTO v_my_driver_id FROM drivers WHERE user_id = auth.uid();
  IF v_my_driver_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only drivers can request payouts';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  -- Check balance using existing RPC
  SELECT * INTO v_balance FROM get_driver_balance(v_my_driver_id);

  IF p_amount > (v_balance.available_to_withdraw::NUMERIC) THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;

  -- Insert payout request
  INSERT INTO driver_payouts (driver_id, amount, status)
  VALUES (v_my_driver_id, p_amount, 'pending')
  RETURNING id INTO v_payout_id;

  -- Log audit
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (
    auth.uid(),
    'payout_requested',
    'driver_payouts',
    v_payout_id,
    jsonb_build_object('amount', p_amount)
  );

  RETURN v_payout_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION request_payout(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_payout(NUMERIC) TO authenticated;

-- 2. Create process_payout RPC for admins
CREATE OR REPLACE FUNCTION process_payout(p_payout_id UUID, p_new_status TEXT, p_reference_note TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Verify admin
  IF auth.jwt() -> 'app_metadata' ->> 'role' != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can process payouts';
  END IF;

  IF p_new_status NOT IN ('completed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  -- Get current status
  SELECT status INTO v_current_status
  FROM driver_payouts
  WHERE id = p_payout_id
  FOR UPDATE NOWAIT; -- Pessimistic lock

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;

  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'Only pending payouts can be processed';
  END IF;

  -- Update status
  UPDATE driver_payouts
  SET status = p_new_status,
      reference_note = p_reference_note,
      updated_at = NOW()
  WHERE id = p_payout_id;

  -- Log audit
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (
    auth.uid(),
    'payout_processed',
    'driver_payouts',
    p_payout_id,
    jsonb_build_object('new_status', p_new_status, 'reference_note', p_reference_note)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION process_payout(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_payout(UUID, TEXT, TEXT) TO authenticated;
