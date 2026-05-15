BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}', true);
SELECT 'admin_dashboard' AS case_name, get_dashboard_stats() IS NOT NULL AS ok;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"driver"}}', true);
SELECT get_dashboard_stats();
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}', true);
SELECT get_dashboard_stats();
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}', true);
SELECT 'admin_slow_queries' AS case_name, count(*) >= 0 AS ok FROM get_slow_queries(3);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}', true);
SELECT * FROM get_slow_queries(3);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"driver"}}', true);
SELECT 'driver_own_balance' AS case_name, get_driver_balance('b0000000-0000-0000-0000-000000000001'::uuid) IS NOT NULL AS ok;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"driver"}}', true);
SELECT get_driver_balance('b0000000-0000-0000-0000-000000000002'::uuid);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}', true);
SELECT 'admin_any_driver_balance' AS case_name, get_driver_balance('b0000000-0000-0000-0000-000000000002'::uuid) IS NOT NULL AS ok;
ROLLBACK;
