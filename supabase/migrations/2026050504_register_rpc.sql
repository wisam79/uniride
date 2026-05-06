-- Migration: Atomic Registration RPC
-- Generated: 2026-05-05 (Phase 4 fixes)

-- ============================================================
-- ATOMIC RPC: REGISTER USER PROFILE
-- ============================================================

CREATE OR REPLACE FUNCTION register_user_profile(
  p_user_id UUID,
  p_full_name TEXT,
  p_role TEXT,
  p_institution_id UUID DEFAULT NULL,
  p_parent_name TEXT DEFAULT NULL,
  p_parent_phone TEXT DEFAULT NULL,
  p_vehicle_info TEXT DEFAULT NULL,
  p_capacity INTEGER DEFAULT 4,
  p_monthly_fee INTEGER DEFAULT 90000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_id UUID;
BEGIN
  -- Security Check
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Prevent role elevation to admin
  IF p_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_ELEVATE_TO_ADMIN');
  END IF;

  -- 1. Update the profile
  UPDATE profiles SET
    full_name = p_full_name,
    role = p_role,
    institution_id = p_institution_id,
    parent_name = p_parent_name,
    parent_phone = p_parent_phone,
    is_activated = true,
    updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND');
  END IF;

  -- 2. If role is driver, create driver record
  IF p_role = 'driver' THEN
    -- Check if driver already exists to be idempotent
    SELECT id INTO v_driver_id FROM drivers WHERE user_id = p_user_id;
    
    IF v_driver_id IS NULL THEN
      INSERT INTO drivers (
        user_id,
        vehicle_info,
        capacity,
        available_seats,
        monthly_fee,
        institution_id,
        is_available
      ) VALUES (
        p_user_id,
        COALESCE(p_vehicle_info, 'غير محدد'),
        p_capacity,
        p_capacity,
        p_monthly_fee,
        p_institution_id,
        true
      )
      RETURNING id INTO v_driver_id;
    ELSE
      -- Update existing driver, do not overwrite available_seats
      UPDATE drivers SET
        vehicle_info = COALESCE(p_vehicle_info, vehicle_info),
        capacity = p_capacity,
        monthly_fee = p_monthly_fee,
        institution_id = COALESCE(p_institution_id, institution_id)
      WHERE id = v_driver_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'role', p_role,
    'driver_id', v_driver_id
  );
END;
$$;