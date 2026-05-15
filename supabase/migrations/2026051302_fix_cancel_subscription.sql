-- UniRide M8: Critical fixes (Phase 1 of 10/10 plan)
-- 1. cancel_subscription: restore seat manually (no trigger dependency)
-- 2. update_trip_status: drop old signature, add admin_cancel_trip RPC

-- ============================================================
-- 1. cancel_subscription with manual seat restore + audit log
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_subscription(p_subscription_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_sub RECORD;
BEGIN
  IF auth.jwt() -> 'app_metadata' ->> 'role' != 'student' THEN
    RAISE EXCEPTION 'Only students can cancel subscriptions';
  END IF;

  SELECT * INTO v_sub FROM subscriptions
  WHERE id = p_subscription_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;
  IF v_sub.student_id != auth.uid() THEN RAISE EXCEPTION 'Not your subscription'; END IF;
  IF v_sub.status NOT IN ('active', 'pending') THEN
    RAISE EXCEPTION 'Cannot cancel: status is %', v_sub.status;
  END IF;

  UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_subscription_id;

  -- Restore seat manually — do NOT depend on a non-existent trigger
  IF v_sub.status = 'active' THEN
    UPDATE routes SET available_seats = available_seats + 1
    WHERE id = v_sub.route_id;
  END IF;

  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (auth.uid(), 'cancel_subscription', 'subscriptions', p_subscription_id,
    jsonb_build_object('route_id', v_sub.route_id, 'previous_status', v_sub.status));
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_subscription(UUID) TO authenticated;

-- ============================================================
-- 2. Drop old update_trip_status with DEFAULT NULL params
-- ============================================================
DROP FUNCTION IF EXISTS update_trip_status(UUID, TEXT, NUMERIC, NUMERIC, UUID);

-- ============================================================
-- 3. update_trip_status without DEFAULT NULL (security fix)
-- ============================================================
CREATE OR REPLACE FUNCTION update_trip_status(
  p_trip_id    UUID,
  p_new_status TEXT,
  p_lat        NUMERIC,
  p_lng        NUMERIC,
  p_driver_id  UUID  -- no DEFAULT!
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_trip_driver_id UUID;
  v_driver_user_id UUID;
  v_is_verified BOOLEAN;
BEGIN
  SELECT driver_id INTO v_trip_driver_id
  FROM trips WHERE id = p_trip_id FOR UPDATE;

  IF v_trip_driver_id IS NULL THEN RAISE EXCEPTION 'Trip not found'; END IF;
  IF v_trip_driver_id != p_driver_id THEN RAISE EXCEPTION 'Not your trip'; END IF;

  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = p_driver_id;
  SELECT is_verified INTO v_is_verified FROM profiles WHERE id = v_driver_user_id;
  IF NOT v_is_verified THEN RAISE EXCEPTION 'Driver not verified'; END IF;

  PERFORM validate_trip_transition(p_trip_id, p_new_status);

  UPDATE trips SET
    status = p_new_status,
    last_lat = COALESCE(p_lat, last_lat),
    last_lng = COALESCE(p_lng, last_lng),
    started_at = CASE WHEN p_new_status = 'in_transit' AND started_at IS NULL THEN NOW() ELSE started_at END,
    ended_at = CASE WHEN p_new_status IN ('completed','absent') THEN NOW() ELSE ended_at END,
    updated_at = NOW()
  WHERE id = p_trip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_trip_status(UUID,TEXT,NUMERIC,NUMERIC,UUID) FROM public;
GRANT EXECUTE ON FUNCTION update_trip_status(UUID,TEXT,NUMERIC,NUMERIC,UUID) TO authenticated;

-- ============================================================
-- 4. admin_cancel_trip: bypass driver check for admins
-- ============================================================
CREATE OR REPLACE FUNCTION admin_cancel_trip(p_trip_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.jwt()->'app_metadata'->>'role' != 'admin' THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  PERFORM validate_trip_transition(p_trip_id, 'cancelled');
  UPDATE trips SET status='cancelled', updated_at=NOW() WHERE id=p_trip_id;
  INSERT INTO audit_logs(user_id,action,resource,resource_id,details)
  VALUES(auth.uid(),'admin_cancel_trip','trips',p_trip_id,'{}');
END;
$$;

GRANT EXECUTE ON FUNCTION admin_cancel_trip(UUID) TO authenticated;