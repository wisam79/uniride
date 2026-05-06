-- Migration: Financial RPCs + handle_new_user trigger + missing RLS + duplicate cleanup
-- Generated: 2026-05-05 (Phase 4 fixes)

-- ============================================================
-- FIX DEFAULT VALUES (commission_bps 2222 → 1500)
-- ============================================================

ALTER TABLE drivers ALTER COLUMN commission_bps SET DEFAULT 1500;
ALTER TABLE cards ALTER COLUMN commission_bps SET DEFAULT 1500;
ALTER TABLE subscriptions ALTER COLUMN commission_bps SET DEFAULT 1500;

-- ============================================================
-- HANDLE NEW USER TRIGGER (auto-create profile on auth signup)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, is_activated)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone'),
    'unassigned',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CLEAN UP DUPLICATE RLS POLICIES (from migration 02)
-- ============================================================

DROP POLICY IF EXISTS "Students can read own trip details" ON trip_students;
DROP POLICY IF EXISTS "Drivers can read trip details for their trips" ON trip_students;

-- ============================================================
-- ENABLE RLS ON MISSING TABLES
-- ============================================================

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES - INSTITUTIONS
-- ============================================================

CREATE POLICY "Anyone can view institutions" ON institutions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage institutions" ON institutions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS POLICIES - DRIVER_SCHEDULES
-- ============================================================

CREATE POLICY "Drivers can view own schedules" ON driver_schedules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_schedules.driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Drivers can manage own schedules" ON driver_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_schedules.driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Students can view driver schedules" ON driver_schedules
  FOR SELECT USING (true);

-- ============================================================
-- RLS POLICIES - APP_SETTINGS
-- ============================================================

CREATE POLICY "Anyone can view app settings" ON app_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage app settings" ON app_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS POLICIES - SUBSCRIPTION_REQUESTS
-- ============================================================

CREATE POLICY "Students can view own requests" ON subscription_requests
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can create requests" ON subscription_requests
  FOR INSERT WITH CHECK (auth.uid() = (SELECT id FROM profiles WHERE id = student_id));

CREATE POLICY "Drivers can view requests for them" ON subscription_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = subscription_requests.driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Drivers can respond to requests" ON subscription_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = subscription_requests.driver_id AND user_id = auth.uid())
  );

-- ============================================================
-- RLS POLICIES - STUDENT_PREFERENCES
-- ============================================================

CREATE POLICY "Students can view own preferences" ON student_preferences
  FOR SELECT USING (auth.uid() = (SELECT id FROM profiles WHERE id = student_id));

CREATE POLICY "Students can manage own preferences" ON student_preferences
  FOR ALL USING (auth.uid() = (SELECT id FROM profiles WHERE id = student_id));

-- ============================================================
-- RLS POLICIES - DRIVER_ABSENCES
-- ============================================================

CREATE POLICY "Drivers can view own absences" ON driver_absences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_absences.driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Drivers can report own absence" ON driver_absences
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_absences.driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage absences" ON driver_absences
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS POLICIES - CARDS
-- ============================================================

CREATE POLICY "Drivers can view own cards" ON cards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = cards.driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Students can view their activated card" ON cards
  FOR SELECT USING (used_by = auth.uid());

CREATE POLICY "Admins can manage cards" ON cards
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS POLICIES - OTP_CODES
-- ============================================================

DROP POLICY IF EXISTS "Anyone can verify OTP" ON otp_codes;

CREATE POLICY "Users can verify own OTP" ON otp_codes
  FOR SELECT USING (auth.uid() = (SELECT id FROM profiles WHERE phone = otp_codes.phone));

-- ============================================================
-- FINANCIAL ACID RPC: PROCESS SUBSCRIPTION PAYMENT
-- ============================================================

CREATE OR REPLACE FUNCTION process_subscription_payment(
  p_subscription_id UUID,
  p_amount INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_commission_rate NUMERIC;
  v_commission_amount INTEGER;
  v_driver_payout INTEGER;
  v_payment_status TEXT;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM subscriptions s
    LEFT JOIN profiles p ON p.id = auth.uid()
    WHERE s.id = p_subscription_id AND (s.student_id = auth.uid() OR p.role = 'admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Idempotency check - lock first to prevent race
  IF p_idempotency_key IS NOT NULL THEN
    SELECT status, payment_status INTO v_current_status, v_payment_status
      FROM subscriptions
      WHERE idempotency_key = p_idempotency_key
      FOR UPDATE;
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_PAYMENT');
    END IF;
  END IF;

  -- Lock row for update
  SELECT status, payment_status INTO v_current_status, v_payment_status
    FROM subscriptions
    WHERE id = p_subscription_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SUBSCRIPTION_NOT_FOUND');
  END IF;

  -- Financial business rules
  IF v_current_status NOT IN ('pending', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_SUBSCRIPTION_STATUS');
  END IF;

  IF v_payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PAID');
  END IF;

  -- Fetch commission rate from app_settings
  SELECT value::numeric INTO v_commission_rate
    FROM app_settings
    WHERE key = 'default_commission_rate';

  IF v_commission_rate IS NULL THEN
    v_commission_rate := 15; -- fallback 15%
  END IF;

  -- Calculate with integer arithmetic (basis points x 100)
  -- Use integer truncation to avoid rounding inconsistencies
  v_commission_amount := (p_amount * v_commission_rate * 100) / 10000;
  v_driver_payout := p_amount - v_commission_amount;

  -- Atomic update
  UPDATE subscriptions SET
    payment_status = 'paid',
    status = CASE WHEN v_current_status = 'pending' THEN 'active' ELSE v_current_status END,
    commission_amount = v_commission_amount,
    driver_payout = v_driver_payout,
    commission_bps = (v_commission_rate * 100)::integer,
    idempotency_key = COALESCE(p_idempotency_key, idempotency_key),
    updated_at = NOW()
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'commission_amount', v_commission_amount,
    'driver_payout', v_driver_payout,
    'commission_rate', v_commission_rate
  );
END;
$$;

-- ============================================================
-- FINANCIAL ACID RPC: APPLY REFERRAL CODE DISCOUNT
-- ============================================================

CREATE OR REPLACE FUNCTION apply_referral_code(
  p_student_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_subscription_id UUID;
  v_current_fee INTEGER;
  v_discounted_fee INTEGER;
  v_discount_amount INTEGER := 5000; -- fixed 5,000 IQD
BEGIN
  -- Security Check
  IF auth.uid() != p_student_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Find referrer by activation code
  SELECT student_id INTO v_referrer_id
    FROM subscriptions
    WHERE activation_code = p_referral_code
      AND status = 'active'
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_REFERRAL_CODE');
  END IF;

  -- Get referrer's active subscription with lock
  SELECT id, monthly_fee INTO v_subscription_id, v_current_fee
    FROM subscriptions
    WHERE student_id = v_referrer_id
      AND status = 'active'
      AND payment_status = 'paid'
    FOR UPDATE OF subscriptions;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_SUBSCRIPTION');
  END IF;

  IF v_current_fee <= v_discount_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'FEE_TOO_LOW_FOR_DISCOUNT');
  END IF;

  v_discounted_fee := v_current_fee - v_discount_amount;

  -- Atomic update
  UPDATE subscriptions SET
    monthly_fee = v_discounted_fee,
    updated_at = NOW()
  WHERE id = v_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'original_fee', v_current_fee,
    'discounted_fee', v_discounted_fee,
    'discount_amount', v_discount_amount
  );
END;
$$;

-- ============================================================
-- FINANCIAL ACID RPC: PROCESS DRIVER ABSENCE DEDUCTION
-- ============================================================

CREATE OR REPLACE FUNCTION process_absence_deduction(
  p_driver_id UUID,
  p_absence_date DATE,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deduction_percent NUMERIC;
  v_monthly_fee INTEGER;
  v_deduction_amount INTEGER := 0;
  v_absence_id UUID;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM drivers d
    LEFT JOIN profiles p ON p.id = auth.uid()
    WHERE d.id = p_driver_id AND (d.user_id = auth.uid() OR p.role = 'admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Fetch deduction rate from settings
  SELECT value::numeric INTO v_deduction_percent
    FROM app_settings
    WHERE key = 'absence_daily_deduction_percent';

  IF v_deduction_percent IS NULL THEN
    v_deduction_percent := 5; -- default 5%
  END IF;

  -- Get driver's monthly fee with lock
  SELECT monthly_fee INTO v_monthly_fee
    FROM drivers WHERE id = p_driver_id
    FOR UPDATE;

  IF v_monthly_fee IS NOT NULL AND v_monthly_fee > 0 THEN
    -- Use integer truncation for consistent deduction calculation
    v_deduction_amount := (v_monthly_fee * v_deduction_percent) / 100;
  END IF;

  -- Insert absence record
  INSERT INTO driver_absences (driver_id, absence_date, deducted_amount, reason)
  VALUES (p_driver_id, p_absence_date, v_deduction_amount, p_reason)
  RETURNING id INTO v_absence_id;

  RETURN jsonb_build_object(
    'success', true,
    'absence_id', v_absence_id,
    'deduction_amount', v_deduction_amount,
    'deduction_percent', v_deduction_percent
  );
END;
$$;

-- ============================================================
-- FINANCIAL ACID RPC: CANCEL SUBSCRIPTION WITH REFUND
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_subscription_with_refund(
  p_subscription_id UUID,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription RECORD;
  v_days_used INTEGER;
  v_days_total INTEGER;
  v_cancellation_fee_percent NUMERIC;
  v_refund_amount INTEGER;
  v_cancellation_fee INTEGER;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM subscriptions s
    LEFT JOIN profiles p ON p.id = auth.uid()
    WHERE s.id = p_subscription_id AND (s.student_id = auth.uid() OR p.role = 'admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT * INTO v_subscription
    FROM subscriptions
    WHERE id = p_subscription_id
      AND status = 'active'
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ACTIVE');
  END IF;

  -- Restore available seats
  UPDATE drivers SET available_seats = available_seats + 1 WHERE id = v_subscription.driver_id;
  UPDATE routes SET available_seats = available_seats + 1 WHERE driver_id = v_subscription.driver_id AND is_active = true;

  -- Calculate days used
  v_days_used := CURRENT_DATE - v_subscription.start_date;
  v_days_total := v_subscription.end_date - v_subscription.start_date;

  IF v_days_used < 1 THEN v_days_used := 0; END IF;
  IF v_days_total < 1 THEN v_days_total := 30; END IF;

  -- Fetch cancellation fee from settings
  SELECT value::numeric INTO v_cancellation_fee_percent
    FROM app_settings
    WHERE key = 'cancellation_fee_percent';

  IF v_cancellation_fee_percent IS NULL THEN
    v_cancellation_fee_percent := 25; -- default 25%
  END IF;

  -- Prorated refund: refund for unused days minus cancellation fee
  -- Use integer arithmetic for consistency
  v_refund_amount := (v_subscription.monthly_fee::numeric * (v_days_total - v_days_used) / v_days_total)::integer;
  v_cancellation_fee := (v_refund_amount * v_cancellation_fee_percent) / 100;
  v_refund_amount := v_refund_amount - v_cancellation_fee;

  IF v_refund_amount < 0 THEN v_refund_amount := 0; END IF;

  UPDATE subscriptions SET
    status = 'cancelled',
    payment_status = CASE WHEN v_subscription.payment_status = 'paid' THEN 'refunded' ELSE v_subscription.payment_status END,
    cancelled_at = NOW(),
    refund_amount = v_refund_amount,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'cancellation_fee', v_cancellation_fee,
    'days_remaining', v_days_total - v_days_used
  );
END;
$$;

-- ============================================================
-- RPC: COMPLETE ROUTE (mark all trip_students as dropped_off)
-- ============================================================

CREATE OR REPLACE FUNCTION complete_route(
  p_trip_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_id UUID;
  v_caller_driver_id UUID;
  v_trip_status TEXT;
BEGIN
  -- Get trip info
  SELECT driver_id, status INTO v_driver_id, v_trip_status
    FROM trips WHERE id = p_trip_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'TRIP_NOT_FOUND');
  END IF;

  -- Verify caller owns the trip
  SELECT id INTO v_caller_driver_id
    FROM drivers WHERE user_id = auth.uid();

  IF v_caller_driver_id IS NULL OR v_caller_driver_id != v_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF v_trip_status != 'in_transit' THEN
    RETURN jsonb_build_object('success', false, 'error', 'TRIP_NOT_IN_TRANSIT');
  END IF;

  -- Mark all students as dropped_off
  UPDATE trip_students
    SET status = 'dropped_off'
    WHERE trip_id = p_trip_id
      AND status = 'picked_up';

  -- Complete the trip
  UPDATE trips
    SET status = 'completed', ended_at = NOW()
    WHERE id = p_trip_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- ADDITIONAL INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_status ON subscriptions(payment_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_activation_code ON subscriptions(activation_code) WHERE activation_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_absences_driver_id ON driver_absences(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_absences_date ON driver_absences(absence_date);
CREATE INDEX IF NOT EXISTS idx_cards_code ON cards(code);
CREATE INDEX IF NOT EXISTS idx_cards_batch_id ON cards(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_to_user ON reviews(to_user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_student ON subscription_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_driver ON subscription_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests(status);

-- ============================================================
-- SEED DEFAULT APP SETTINGS
-- ============================================================

INSERT INTO app_settings (key, value) VALUES
  ('default_commission_rate', '15'),
  ('cancellation_fee_percent', '25'),
  ('absence_daily_deduction_percent', '5'),
  ('tracking_interval_minutes', '5')
ON CONFLICT (key) DO NOTHING;