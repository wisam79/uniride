import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { SubscriptionsChart } from '@/components/charts/SubscriptionsChart';
import { TripsChart } from '@/components/charts/TripsChart';
import { getAdminClient } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  await requireAdmin();
  const supabase = getAdminClient();

  // Fetch data for charts
  const { data: revenueData } = await supabase
    .from('subscriptions')
    .select('created_at, monthly_fee, commission_amount, driver_payout')
    .order('created_at', { ascending: true })
    .limit(30);

  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('status');

  const subscriptionStatus = (() => {
    const counts = { active: 0, cancelled: 0, expired: 0 };
    subscriptionData?.forEach((s: any) => {
      if (counts.hasOwnProperty(s.status)) counts[s.status as keyof typeof counts]++;
    });
    return [
      { name: 'نشط', value: counts.active },
      { name: 'ملغي', value: counts.cancelled },
      { name: 'منتهي', value: counts.expired },
    ];
  })();

  const { data: tripsData } = await supabase
    .from('trips')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(50);

  // Transform revenue data
  const transformedRevenue = revenueData?.map((d: any) => ({
    date: new Date(d.created_at).toLocaleDateString('ar-IQ'),
    revenue: d.monthly_fee,
  })) || [];

  // Transform trips data
  const transformedTrips = tripsData?.reduce((acc: any[], trip: any) => {
    const date = new Date(trip.created_at).toLocaleDateString('ar-IQ');
    const existing = acc.find((a: any) => a.date === date);
    if (existing) existing.trips++;
    else acc.push({ date, trips: 1 });
    return acc;
  }, [] as any[]) || [];

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-3xl font-bold">لوحة التحليلات</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>الإيرادات (آخر 30 يوم)</CardTitle></CardHeader>
          <CardContent><RevenueChart data={transformedRevenue} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>حالة الاشتراكات</CardTitle></CardHeader>
          <CardContent><SubscriptionsChart data={subscriptionStatus} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>الرحلات اليومية</CardTitle></CardHeader>
          <CardContent><TripsChart data={transformedTrips} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
