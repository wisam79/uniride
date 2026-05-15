-- 1. تفعيل الامتداد
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 2. View للاستعلامات البطيئة (top 20)
CREATE OR REPLACE VIEW public.slow_queries AS
SELECT
  query,
  calls,
  ROUND((mean_exec_time)::numeric, 2) AS mean_exec_time,
  ROUND((total_exec_time)::numeric, 2) AS total_exec_time,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 3. صلاحية القراءة للـ admin dashboard
GRANT SELECT ON public.slow_queries TO authenticated;
