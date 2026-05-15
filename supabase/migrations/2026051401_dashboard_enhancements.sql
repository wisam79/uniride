-- 1. Get daily trip counts for the last N days
CREATE OR REPLACE FUNCTION get_daily_activity(p_days INT DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.jwt() -> 'app_metadata' ->> 'role' != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(t) INTO v_result
  FROM (
    SELECT 
      d::date as day,
      COUNT(tr.id) as count
    FROM generate_series(CURRENT_DATE - (p_days - 1) * INTERVAL '1 day', CURRENT_DATE, '1 day') d
    LEFT JOIN trips tr ON tr.created_at::date = d::date
    GROUP BY d::date
    ORDER BY d::date ASC
  ) t;

  RETURN v_result;
END;
$$;

-- 2. Get recent active trips with route and driver info
CREATE OR REPLACE FUNCTION get_recent_active_trips(p_limit INT DEFAULT 5)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.jwt() -> 'app_metadata' ->> 'role' != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(t) INTO v_result
  FROM (
    SELECT 
      tr.id,
      tr.status,
      tr.scheduled_at,
      r.title as route_title,
      p.full_name as driver_name
    FROM trips tr
    JOIN routes r ON tr.route_id = r.id
    JOIN drivers d ON tr.driver_id = d.id
    JOIN profiles p ON d.user_id = p.id
    WHERE tr.status IN ('driver_waiting', 'in_transit')
    ORDER BY tr.updated_at DESC
    LIMIT p_limit
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_daily_activity(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_active_trips(INT) TO authenticated;
