-- UniRide: Harden sensitive RPCs and query-monitoring exposure
-- 1) Restrict get_dashboard_stats() to admin callers
-- 2) Restrict get_driver_balance() to same driver or admin
-- 3) Replace direct slow_queries view access with admin-only RPC

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  result JSON;
BEGIN
  IF auth.jwt() -> 'app_metadata' ->> 'role' != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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

CREATE OR REPLACE FUNCTION get_driver_balance(p_driver_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_total_earned NUMERIC(12, 2) := 0;
  v_total_paid NUMERIC(12, 2) := 0;
  v_pending_payouts NUMERIC(12, 2) := 0;
  v_balance NUMERIC(12, 2) := 0;
  v_role TEXT;
  v_my_driver_id UUID;
BEGIN
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_role;

  IF v_role = 'driver' THEN
    SELECT id INTO v_my_driver_id FROM drivers WHERE user_id = auth.uid();
    IF v_my_driver_id IS NULL OR v_my_driver_id != p_driver_id THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF v_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(SUM(r.price), 0)
  INTO v_total_earned
  FROM subscriptions s
  JOIN routes r ON s.route_id = r.id
  WHERE r.driver_id = p_driver_id
    AND s.status IN ('active', 'expired');

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM driver_payouts
  WHERE driver_id = p_driver_id
    AND status = 'completed';

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

CREATE OR REPLACE FUNCTION get_slow_queries(p_limit INT DEFAULT 20)
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  mean_exec_time NUMERIC,
  total_exec_time NUMERIC,
  rows BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.jwt() -> 'app_metadata' ->> 'role' != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    sq.query,
    sq.calls,
    sq.mean_exec_time,
    sq.total_exec_time,
    sq.rows
  FROM slow_queries sq
  LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'slow_queries'
      AND c.relkind IN ('v', 'm')
  ) THEN
    EXECUTE 'REVOKE SELECT ON public.slow_queries FROM authenticated';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION get_slow_queries(INT) TO authenticated;
