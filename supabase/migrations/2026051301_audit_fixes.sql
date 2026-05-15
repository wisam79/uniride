-- 1. Fix Double Increment: Redeclare cancel_subscription without the manual available_seats increment
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

  -- Update status to cancelled. The AFTER UPDATE trigger 'on_subscription_cancel' 
  -- will automatically increment the available_seats in the routes table.
  UPDATE subscriptions
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_subscription_id;

  -- ✅ Audit log
  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (
    auth.uid(),
    'cancel_subscription',
    'subscriptions',
    p_subscription_id,
    jsonb_build_object('route_id', v_sub.route_id, 'previous_status', v_sub.status)
  );
END;
$$;

-- 2. Race Condition: Add missing unique constraint on subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription 
ON subscriptions (student_id, route_id) 
WHERE status IN ('active', 'pending');

-- 3. Inconsistent Driver Identity
ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS ratings_driver_id_fkey,
  ADD CONSTRAINT ratings_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE;

-- 4. RLS Policy UX Limitation: Let students view all active trips
DROP POLICY IF EXISTS "Trips: Students see own route trips" ON public.trips;
CREATE POLICY "Trips: Students see all trips"
  ON public.trips FOR SELECT
  USING (deleted_at IS NULL);

-- 5. CRITICAL SECURITY FLAW: RLS Bypass in update_trip_status
CREATE OR REPLACE FUNCTION update_trip_status(
  p_trip_id    UUID,
  p_new_status TEXT,
  p_lat        NUMERIC DEFAULT NULL,
  p_lng        NUMERIC DEFAULT NULL,
  p_driver_id  UUID    -- DEFAULT NULL removed
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

  IF v_trip_driver_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF v_trip_driver_id != p_driver_id THEN
    RAISE EXCEPTION 'Unauthorized: not your trip';
  END IF;

  -- Verify driver
  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = p_driver_id;
  SELECT is_verified INTO v_is_verified FROM profiles WHERE id = v_driver_user_id;
  
  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'Unauthorized: driver is not verified';
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

REVOKE EXECUTE ON FUNCTION update_trip_status(UUID, TEXT, NUMERIC, NUMERIC, UUID) FROM public;
GRANT EXECUTE ON FUNCTION update_trip_status(UUID, TEXT, NUMERIC, NUMERIC, UUID) TO authenticated;
