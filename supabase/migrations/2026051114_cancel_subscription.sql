-- UniRide M7: cancel_subscription RPC
-- Safely cancels a subscription and restores the seat atomically.
-- Replaces the unsafe direct client-side UPDATE in subscriptions.tsx.

CREATE OR REPLACE FUNCTION cancel_subscription(p_subscription_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_role TEXT;
BEGIN
  -- 1. Role check — only students can cancel their own subscriptions
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_role;
  IF v_role != 'student' THEN
    RAISE EXCEPTION 'Only students can cancel subscriptions';
  END IF;

  -- 2. Fetch and lock the subscription row
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  -- 3. Ownership check — must belong to the calling student
  IF v_sub.student_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only cancel your own subscriptions';
  END IF;

  -- 4. Status check — only active or pending subscriptions can be cancelled
  IF v_sub.status NOT IN ('active', 'pending') THEN
    RAISE EXCEPTION 'Subscription is already % and cannot be cancelled', v_sub.status;
  END IF;

  -- 5. Cancel the subscription
  UPDATE subscriptions
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_subscription_id;

  -- 6. Restore the seat on the route (only if subscription was active)
  IF v_sub.status = 'active' THEN
    UPDATE routes
    SET available_seats = available_seats + 1
    WHERE id = v_sub.route_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users (RLS + ownership check inside function)
GRANT EXECUTE ON FUNCTION cancel_subscription(UUID) TO authenticated;
