-- UniRide: Soft Delete for trips and subscriptions
-- REQ-9: إضافة deleted_at على trips و subscriptions مع تحديث RLS policies
--
-- التغييرات:
--   1. إضافة عمود deleted_at TIMESTAMPTZ على trips و subscriptions
--   2. Partial indexes للأداء (تستثني السجلات المحذوفة)
--   3. إعادة تعريف RLS policies لاستبعاد السجلات المحذوفة (deleted_at IS NULL)

-- ════════════════════════════════════════════════════════════════
-- 1. إضافة عمود deleted_at
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ════════════════════════════════════════════════════════════════
-- 2. Partial indexes للأداء
--    تُسرّع الاستعلامات التي تفلتر السجلات غير المحذوفة
-- ════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_trips_not_deleted
  ON public.trips(id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_not_deleted
  ON public.subscriptions(id)
  WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- 3. تحديث RLS policies على trips
--    نحذف القديمة ونُعيد إنشاءها مع شرط deleted_at IS NULL
-- ════════════════════════════════════════════════════════════════

-- Trips: Students see own route trips
DROP POLICY IF EXISTS "Trips: Students see own route trips" ON public.trips;
CREATE POLICY "Trips: Students see own route trips"
  ON public.trips FOR SELECT
  USING (
    deleted_at IS NULL
    AND route_id IN (
      SELECT route_id
      FROM public.subscriptions
      WHERE student_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- Trips: Driver sees own trips
DROP POLICY IF EXISTS "Trips: Driver sees own trips" ON public.trips;
CREATE POLICY "Trips: Driver sees own trips"
  ON public.trips FOR SELECT
  USING (
    deleted_at IS NULL
    AND driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Trips: Admins see all
-- الأدمن يرى كل شيء بما فيه المحذوف (للمراجعة والتدقيق)
DROP POLICY IF EXISTS "Trips: Admins see all" ON public.trips;
CREATE POLICY "Trips: Admins see all"
  ON public.trips FOR SELECT
  USING (is_admin());

-- Admins can update any trip (من migration 2026051111)
DROP POLICY IF EXISTS "Admins can update any trip" ON public.trips;
CREATE POLICY "Admins can update any trip"
  ON public.trips FOR UPDATE
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ════════════════════════════════════════════════════════════════
-- 4. تحديث RLS policies على subscriptions
--    نحذف القديمة ونُعيد إنشاءها مع شرط deleted_at IS NULL
-- ════════════════════════════════════════════════════════════════

-- Subscriptions: Students see own
DROP POLICY IF EXISTS "Subscriptions: Students see own" ON public.subscriptions;
CREATE POLICY "Subscriptions: Students see own"
  ON public.subscriptions FOR SELECT
  USING (
    deleted_at IS NULL
    AND student_id = auth.uid()
  );

-- Subscriptions: Admins see all
-- الأدمن يرى كل شيء بما فيه المحذوف (للمراجعة والتدقيق)
DROP POLICY IF EXISTS "Subscriptions: Admins see all" ON public.subscriptions;
CREATE POLICY "Subscriptions: Admins see all"
  ON public.subscriptions FOR SELECT
  USING (is_admin());

-- Subscriptions: Driver sees route subscriptions
DROP POLICY IF EXISTS "Subscriptions: Driver sees route subscriptions" ON public.subscriptions;
CREATE POLICY "Subscriptions: Driver sees route subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    deleted_at IS NULL
    AND route_id IN (
      SELECT r.id
      FROM public.routes r
      JOIN public.drivers d ON r.driver_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- Subscriptions: Students cancel own active (من migration 2026051003)
DROP POLICY IF EXISTS "Subscriptions: Students cancel own active" ON public.subscriptions;
CREATE POLICY "Subscriptions: Students cancel own active"
  ON public.subscriptions FOR UPDATE
  USING (
    deleted_at IS NULL
    AND student_id = auth.uid()
    AND status IN ('active', 'pending')
  )
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'cancelled'
  );

-- Admins can update any subscription (من migration 2026051111)
DROP POLICY IF EXISTS "Admins can update any subscription" ON public.subscriptions;
CREATE POLICY "Admins can update any subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
