-- ════════════════════════════════════════════════════════════════
-- UniRide: Secure Idempotency
-- ════════════════════════════════════════════════════════════════

-- 1. Create a unique index on audit_logs to prevent duplicate idempotency keys
-- We only enforce uniqueness when idempotencyKey is present
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_idempotency 
ON audit_logs (user_id, action, (details->>'idempotencyKey')) 
WHERE details->>'idempotencyKey' IS NOT NULL;

-- 2. Update update_trip_status to handle idempotency securely within transaction
CREATE OR REPLACE FUNCTION update_trip_status(
  p_trip_id UUID,
  p_new_status TEXT,
  p_lat NUMERIC DEFAULT NULL,
  p_lng NUMERIC DEFAULT NULL,
  p_driver_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_current_status TEXT;
  v_driver_id UUID;
BEGIN
  -- Insert idempotency lock first to prevent race conditions
  IF p_idempotency_key IS NOT NULL THEN
    BEGIN
      INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
      VALUES (
        auth.uid(),
        'trip_status_change',
        'trips',
        p_trip_id,
        jsonb_build_object(
          'newStatus', p_new_status,
          'lat', p_lat,
          'lng', p_lng,
          'idempotencyKey', p_idempotency_key
        )
      );
    EXCEPTION WHEN unique_violation THEN
      -- If we hit a unique violation, the request is already processed/processing
      RAISE EXCEPTION 'IDEMPOTENT_REQUEST';
    END;
  END IF;

  -- Lock the row for update
  SELECT status, driver_id INTO v_current_status, v_driver_id
  FROM trips
  WHERE id = p_trip_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  -- Validate driver
  IF p_driver_id IS NOT NULL AND v_driver_id != p_driver_id THEN
    RAISE EXCEPTION 'Not authorized to update this trip';
  END IF;

  -- Validate transition
  IF NOT validate_trip_transition(p_trip_id, p_new_status) THEN
    RAISE EXCEPTION 'Invalid transition from % to %', v_current_status, p_new_status;
  END IF;

  -- Update trip
  UPDATE trips
  SET status = p_new_status,
      last_lat = COALESCE(p_lat, last_lat),
      last_lng = COALESCE(p_lng, last_lng),
      updated_at = NOW(),
      started_at = CASE WHEN p_new_status = 'in_transit' AND v_current_status = 'driver_waiting' THEN NOW() ELSE started_at END,
      ended_at = CASE WHEN p_new_status IN ('completed', 'cancelled', 'absent') THEN NOW() ELSE ended_at END
  WHERE id = p_trip_id;

  -- If we didn't pass an idempotency key, we still need to log the audit
  IF p_idempotency_key IS NULL THEN
    INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
    VALUES (
      auth.uid(),
      'trip_status_change',
      'trips',
      p_trip_id,
      jsonb_build_object(
        'newStatus', p_new_status,
        'lat', p_lat,
        'lng', p_lng
      )
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_trip_status(UUID, TEXT, NUMERIC, NUMERIC, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_trip_status(UUID, TEXT, NUMERIC, NUMERIC, UUID, TEXT) TO authenticated;
