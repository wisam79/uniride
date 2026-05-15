-- ════════════════════════════════════════════════════════════════
-- UniRide: Revoke PUBLIC execute from all SECURITY DEFINER RPCs
-- ════════════════════════════════════════════════════════════════
-- As per uniride-migration-master mandates, all SECURITY DEFINER
-- functions must explicitly revoke PUBLIC execute permissions to
-- prevent unauthorized access, and grant explicitly to authenticated.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
          AND p.prorettype != 'trigger'::regtype
    LOOP
        -- Revoke default public execution
        EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.sig || ' FROM PUBLIC';
        -- Explicitly grant to authenticated
        EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.sig || ' TO authenticated';
    END LOOP;
END;
$$;
