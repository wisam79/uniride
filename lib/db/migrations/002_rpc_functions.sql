-- Migration: 002_rpc_functions.sql
-- ACID Transaction functions for atomic operations

-- Book a route seat atomically (prevents overbooking)
CREATE OR REPLACE FUNCTION book_route_seat(
  p_route_id UUID,
  p_student_id UUID,
  p_idempotency_key TEXT
) RETURNS JSONB AS $$
DECLARE
  v_available INT;
  v_subscription_id UUID;
  v_driver_id UUID;
  v_monthly_fee INT;
  v_driver_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM subscriptions WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST');
  END IF;

  SELECT available_seats, driver_id, monthly_fare INTO v_available, v_driver_id, v_monthly_fee
    FROM routes WHERE id = p_route_id FOR UPDATE;

  IF v_available IS NULL OR v_available <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_SEATS');
  END IF;

  SELECT p.full_name INTO v_driver_name
    FROM drivers d JOIN profiles p ON d.user_id = p.id
    WHERE d.id = v_driver_id;

  UPDATE routes SET available_seats = available_seats - 1, total_students = total_students + 1
    WHERE id = p_route_id;

  INSERT INTO subscriptions (
    student_id, driver_id, driver_name, start_date, end_date,
    monthly_fee, commission_bps, commission_amount, driver_payout,
    payment_status, trips_used, trips_per_month, status, idempotency_key
  ) VALUES (
    p_student_id, v_driver_id, COALESCE(v_driver_name, 'Unknown Driver'),
    CURRENT_DATE, (CURRENT_DATE + INTERVAL '30 days')::date,
    v_monthly_fee, 1500,
    (v_monthly_fee * 1500 / 10000),
    v_monthly_fee - (v_monthly_fee * 1500 / 10000),
    'pending', 0, 44, 'pending', p_idempotency_key
  ) RETURNING id INTO v_subscription_id;

  RETURN jsonb_build_object('success', true, 'subscription_id', v_subscription_id);
END;
$$ LANGUAGE plpgsql;

-- Complete a trip and update subscription trips_used
CREATE OR REPLACE FUNCTION complete_trip(p_trip_id UUID) RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  SELECT subscription_id INTO v_subscription_id FROM trips WHERE id = p_trip_id;

  UPDATE trips SET status = 'completed', ended_at = NOW() WHERE id = p_trip_id;

  IF v_subscription_id IS NOT NULL THEN
    UPDATE subscriptions SET trips_used = trips_used + 1, updated_at = NOW()
      WHERE id = v_subscription_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Redeem activation code atomically
CREATE OR REPLACE FUNCTION redeem_activation_code(p_code TEXT, p_student_id UUID) RETURNS JSONB AS $$
DECLARE
  v_card RECORD;
  v_driver_name TEXT;
  v_subscription_id UUID;
BEGIN
  SELECT * INTO v_card FROM cards WHERE code = p_code AND is_used = false FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_USED_CODE');
  END IF;

  UPDATE cards SET is_used = true, used_by = p_student_id, used_at = NOW()
    WHERE id = v_card.id;

  SELECT p.full_name INTO v_driver_name
    FROM drivers d JOIN profiles p ON d.user_id = p.id
    WHERE d.id = v_card.driver_id;

  INSERT INTO subscription_requests (
    student_id, driver_id, institution_id,
    go_time, return_time, pickup_area, dropoff_area, status
  ) SELECT
    p_student_id, v_card.driver_id, d.institution_id,
    '08:00', '14:00', '', '', 'pending'
  FROM drivers d WHERE d.id = v_card.driver_id;

  INSERT INTO subscriptions (
    student_id, driver_id, driver_name, start_date, end_date,
    monthly_fee, commission_bps, commission_amount, driver_payout,
    payment_status, trips_used, trips_per_month, status, activation_code
  ) VALUES (
    p_student_id, v_card.driver_id, COALESCE(v_driver_name, 'Unknown Driver'),
    CURRENT_DATE, (CURRENT_DATE + INTERVAL '30 days')::date,
    v_card.monthly_fee, v_card.commission_bps,
    (v_card.monthly_fee * v_card.commission_bps / 10000),
    v_card.monthly_fee - (v_card.monthly_fee * v_card.commission_bps / 10000),
    'pending', 0, 44, 'active', p_code
  ) RETURNING id INTO v_subscription_id;

  UPDATE profiles SET is_activated = true WHERE id = p_student_id;

  RETURN jsonb_build_object('success', true, 'subscription_id', v_subscription_id);
END;
$$ LANGUAGE plpgsql;

-- Generate activation codes for a driver
CREATE OR REPLACE FUNCTION generate_activation_codes(
  p_driver_id UUID,
  p_quantity INT,
  p_monthly_fee INT DEFAULT 90000
) RETURNS SETOF cards AS $$
DECLARE
  v_code TEXT;
  v_batch_id TEXT := gen_random_uuid()::text;
BEGIN
  FOR i IN 1..p_quantity LOOP
    v_code := upper(substr(gen_random_uuid()::text, 1, 6));
    INSERT INTO cards (driver_id, code, monthly_fee, commission_bps, batch_id)
      VALUES (p_driver_id, v_code, p_monthly_fee, 1500, v_batch_id)
      RETURNING * INTO result;
    RETURN NEXT result;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Index for idempotency key lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_idempotency_key
  ON subscriptions(idempotency_key) WHERE idempotency_key IS NOT NULL;
