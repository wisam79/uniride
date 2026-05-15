-- UniRide: search_path hardening + update_my_profile RPC + audit logging
-- Fixes:
--   1. SET search_path = public على كل SECURITY DEFINER functions
--      (يمنع schema injection attacks)
--   2. update_my_profile() RPC — بديل آمن لـ direct profile update
--   3. Audit logging لـ activate_license, cancel_subscription, create_license_batch

-- ════════════════════════════════════════════════════════════════
-- 1. إعادة تعريف الدوال الحساسة مع SET search_path = public
--    هذا يمنع أي مهاجم من إنشاء schema بنفس الاسم لتحويل الاستعلامات
-- ════════════════════════════════════════════════════════════════

-- get_my_role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'student'
  );
$$;

-- is_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT get_my_role() = 'admin';
$$;

-- ping
CREATE OR REPLACE FUNCTION ping()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  RETURN TRUE;
END;
$$;

-- get_dashboard_stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users',          (SELECT count(*) FROM profiles),
    'total_drivers',        (SELECT count(*) FROM drivers),
    'total_routes',         (SELECT count(*) FROM routes),
    'active_routes',        (SELECT count(*) FROM routes WHERE is_active = true),
    'total_trips',          (SELECT count(*) FROM trips),
    'active_trips',         (SELECT count(*) FROM trips WHERE status IN ('driver_waiting', 'in_transit')),
    'total_subscriptions',  (SELECT count(*) FROM subscriptions),
    'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'active'),
    'monthly_revenue', (
      SELECT COALESCE(SUM(r.price), 0)
      FROM subscriptions s
      JOIN routes r ON r.id = s.route_id
      WHERE s.status = 'active'
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- validate_trip_transition
CREATE OR REPLACE FUNCTION validate_trip_transition(p_trip_id UUID, p_new_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_current_status TEXT;
  v_valid BOOLEAN;
BEGIN
  SELECT status INTO v_current_status FROM trips WHERE id = p_trip_id;
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;
  v_valid := CASE v_current_status
    WHEN 'scheduled'      THEN p_new_status IN ('driver_waiting', 'cancelled')
    WHEN 'driver_waiting' THEN p_new_status IN ('in_transit', 'cancelled')
    WHEN 'in_transit'     THEN p_new_status IN ('completed', 'absent')
    WHEN 'completed'      THEN FALSE
    WHEN 'absent'         THEN FALSE
    WHEN 'cancelled'      THEN FALSE
    ELSE FALSE
  END;
  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_current_status, p_new_status;
  END IF;
  RETURN TRUE;
END;
$$;

-- update_trip_status
CREATE OR REPLACE FUNCTION update_trip_status(
  p_trip_id    UUID,
  p_new_status TEXT,
  p_lat        NUMERIC DEFAULT NULL,
  p_lng        NUMERIC DEFAULT NULL,
  p_driver_id  UUID    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_trip_driver_id UUID;
BEGIN
  SELECT driver_id INTO v_trip_driver_id
  FROM trips WHERE id = p_trip_id FOR UPDATE;

  IF v_trip_driver_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF p_driver_id IS NOT NULL AND v_trip_driver_id != p_driver_id THEN
    RAISE EXCEPTION 'Unauthorized: not your trip';
  END IF;

  PERFORM validate_trip_transition(p_trip_id, p_new_status);

  UPDATE trips SET
    status    = p_new_status,
    last_lat  = CASE WHEN p_lat IS NOT NULL THEN p_lat ELSE last_lat END,
    last_lng  = CASE WHEN p_lng IS NOT NULL THEN p_lng ELSE last_lng END,
    started_at = CASE
      WHEN p_new_status = 'in_transit' AND started_at IS NULL THEN NOW()
      ELSE started_at
    END,
    ended_at = CASE
      WHEN p_new_status IN ('completed', 'absent') THEN NOW()
      ELSE ended_at
    END,
    updated_at = NOW()
  WHERE id = p_trip_id;
END;
$$;

-- update_trip_location
CREATE OR REPLACE FUNCTION update_trip_location(
  p_trip_id UUID,
  p_lat     NUMERIC,
  p_lng     NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_driver_id UUID;
  v_status    TEXT;
BEGIN
  SELECT d.id INTO v_driver_id FROM drivers d WHERE d.user_id = auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found';
  END IF;

  SELECT status INTO v_status
  FROM trips WHERE id = p_trip_id AND driver_id = v_driver_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Trip not found or not assigned to you';
  END IF;

  IF v_status NOT IN ('driver_waiting', 'in_transit') THEN
    RAISE EXCEPTION 'Cannot update location for trip with status: %', v_status;
  END IF;

  UPDATE trips
  SET last_lat = p_lat, last_lng = p_lng, updated_at = NOW()
  WHERE id = p_trip_id;

  RETURN TRUE;
END;
$$;

-- check_rate_limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id        UUID,
  p_action         TEXT,
  p_limit          INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_count        INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  DELETE FROM rate_limits
  WHERE user_id = p_user_id
    AND action  = p_action
    AND window_start < v_window_start;

  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action  = p_action
    AND window_start >= v_window_start;

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limits (user_id, action, window_start, request_count)
  VALUES (p_user_id, p_action, NOW(), 1);

  RETURN TRUE;
END;
$$;

-- log_audit
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id     UUID,
  p_action      TEXT,
  p_resource    TEXT,
  p_resource_id UUID,
  p_details     JSONB
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (p_user_id, p_action, p_resource, p_resource_id, p_details);
END;
$$;

-- cleanup_rate_limits
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- get_driver_avg_rating
CREATE OR REPLACE FUNCTION get_driver_avg_rating(p_driver_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT ROUND(AVG(rating)::NUMERIC, 1)
  FROM ratings
  WHERE driver_id = p_driver_id;
$$;

-- enforce_profile_privileged_fields (trigger function)
CREATE OR REPLACE FUNCTION enforce_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
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
$$;

-- auto_create_profile_on_signup (if exists)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, is_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_app_meta_data->>'role', 'student'),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 2. update_my_profile() — RPC آمن لتحديث الملف الشخصي
--    يسمح فقط بتحديث full_name و phone
--    يمنع تعديل role أو is_verified أو institution_id
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_my_profile(
  p_full_name TEXT,
  p_phone     TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- التحقق من أن المستخدم مسجّل الدخول
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- التحقق من صحة المدخلات
  IF length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'full_name cannot be empty';
  END IF;

  IF length(trim(p_full_name)) > 100 THEN
    RAISE EXCEPTION 'full_name too long (max 100 characters)';
  END IF;

  IF length(trim(p_phone)) > 20 THEN
    RAISE EXCEPTION 'phone too long (max 20 characters)';
  END IF;

  -- تحديث الحقول المسموح بها فقط — لا role، لا is_verified، لا institution_id
  UPDATE profiles
  SET
    full_name  = trim(p_full_name),
    phone      = trim(p_phone),
    updated_at = NOW()
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_my_profile(TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION update_my_profile(TEXT, TEXT) FROM anon;

-- ════════════════════════════════════════════════════════════════
-- 3. Audit logging لـ activate_license
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION activate_license(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_license         RECORD;
  v_subscription_id UUID;
  v_role            TEXT;
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
    SELECT 1 FROM subscriptions
    WHERE student_id = auth.uid()
      AND route_id   = v_license.route_id
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

  -- ✅ Audit log
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (
    auth.uid(),
    'activate_license',
    'licenses',
    v_license.id,
    jsonb_build_object(
      'code',            upper(p_code),
      'route_id',        v_license.route_id,
      'subscription_id', v_subscription_id
    )
  );

  RETURN v_subscription_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 4. Audit logging لـ cancel_subscription
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cancel_subscription(p_subscription_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_sub  RECORD;
  v_role TEXT;
BEGIN
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_role;
  IF v_role != 'student' THEN
    RAISE EXCEPTION 'Only students can cancel subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  IF v_sub.student_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only cancel your own subscriptions';
  END IF;

  IF v_sub.status NOT IN ('active', 'pending') THEN
    RAISE EXCEPTION 'Subscription is already % and cannot be cancelled', v_sub.status;
  END IF;

  UPDATE subscriptions
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_subscription_id;

  IF v_sub.status = 'active' THEN
    UPDATE routes
    SET available_seats = available_seats + 1
    WHERE id = v_sub.route_id;
  END IF;

  -- ✅ Audit log
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (
    auth.uid(),
    'cancel_subscription',
    'subscriptions',
    p_subscription_id,
    jsonb_build_object(
      'route_id',       v_sub.route_id,
      'previous_status', v_sub.status
    )
  );
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 5. Audit logging لـ create_license_batch
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION create_license_batch(
  p_route_id   UUID,
  p_batch_name TEXT,
  p_quantity   INT,
  p_price      NUMERIC,
  p_valid_days INT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_batch_id UUID;
  v_code     TEXT;
  i          INT;
  v_role     TEXT;
BEGIN
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_role;
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create license batches';
  END IF;

  INSERT INTO license_batches (created_by, route_id, batch_name, quantity, price, valid_days)
  VALUES (auth.uid(), p_route_id, p_batch_name, p_quantity, p_price, p_valid_days)
  RETURNING id INTO v_batch_id;

  FOR i IN 1..p_quantity LOOP
    LOOP
      v_code := upper(substring(md5(random()::text) from 1 for 8));
      BEGIN
        INSERT INTO licenses (batch_id, route_id, code, valid_days)
        VALUES (v_batch_id, p_route_id, v_code, p_valid_days);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- retry
      END;
    END LOOP;
  END LOOP;

  -- ✅ Audit log
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (
    auth.uid(),
    'create_license_batch',
    'license_batches',
    v_batch_id,
    jsonb_build_object(
      'route_id',   p_route_id,
      'batch_name', p_batch_name,
      'quantity',   p_quantity,
      'price',      p_price,
      'valid_days', p_valid_days
    )
  );

  RETURN v_batch_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 6. create_trip مع search_path
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION create_trip(p_route_id UUID, p_scheduled_at TIMESTAMPTZ)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_trip_id   UUID;
  v_role      TEXT;
  v_driver_id UUID;
BEGIN
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_role;
  IF v_role != 'driver' THEN
    RAISE EXCEPTION 'Only drivers can create trips';
  END IF;

  SELECT d.id INTO v_driver_id FROM drivers d WHERE d.user_id = auth.uid();
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
$$;

-- ════════════════════════════════════════════════════════════════
-- 7. submit_rating مع search_path
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION submit_rating(
  p_trip_id UUID,
  p_rating  INT,
  p_comment TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_trip           RECORD;
  v_driver_user_id UUID;
  v_rating_id      UUID;
  v_role           TEXT;
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

  SELECT d.user_id INTO v_driver_user_id FROM drivers d WHERE d.id = v_trip.driver_id;
  IF v_driver_user_id IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found for trip';
  END IF;

  INSERT INTO ratings (trip_id, student_id, driver_id, rating, comment)
  VALUES (p_trip_id, auth.uid(), v_driver_user_id, p_rating, p_comment)
  RETURNING id INTO v_rating_id;

  RETURN v_rating_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 8. get_analytics_summary مع search_path
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.jwt() -> 'app_metadata' ->> 'role' != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_trips', (
      SELECT COUNT(*) FROM trips
      WHERE created_at BETWEEN p_start_date AND p_end_date
    ),
    'completed_trips', (
      SELECT COUNT(*) FROM trips
      WHERE status = 'completed'
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    'cancelled_trips', (
      SELECT COUNT(*) FROM trips
      WHERE status = 'cancelled'
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(r.price), 0)
      FROM subscriptions s
      JOIN routes r ON s.route_id = r.id
      WHERE s.created_at BETWEEN p_start_date AND p_end_date
        AND s.status = 'active'
    ),
    'active_students', (
      SELECT COUNT(DISTINCT student_id) FROM subscriptions WHERE status = 'active'
    ),
    'active_drivers', (
      SELECT COUNT(*) FROM drivers d JOIN profiles p ON d.user_id = p.id
      WHERE p.is_verified = true
    ),
    'avg_rating', (
      SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM ratings
      WHERE created_at BETWEEN p_start_date AND p_end_date
    ),
    'trips_by_status', (
      SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
      FROM (
        SELECT status, COUNT(*) AS cnt FROM trips
        WHERE created_at BETWEEN p_start_date AND p_end_date
        GROUP BY status
      ) t
    ),
    'top_routes', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT r.title, COUNT(s.id) AS subscriptions, r.price,
               COUNT(s.id) * r.price AS revenue
        FROM routes r
        LEFT JOIN subscriptions s
          ON r.id = s.route_id
          AND s.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY r.id, r.title, r.price
        ORDER BY subscriptions DESC
        LIMIT 10
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
