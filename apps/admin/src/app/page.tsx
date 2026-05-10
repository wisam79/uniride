"use client";

import { useEffect, useState } from "react";
import { Authenticated, useLogout, useCustom } from "@refinedev/core";
import { Box, Card, CardContent, Typography, Grid } from "@mui/material";

interface DashboardStats {
  total_users: number;
  total_drivers: number;
  total_routes: number;
  active_routes: number;
  total_trips: number;
  active_trips: number;
  total_subscriptions: number;
  active_subscriptions: number;
  monthly_revenue: number;
}

function StatCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom variant="overline">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color, fontWeight: "bold" }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const { mutate: logout } = useLogout();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const { data, isLoading, error } = useCustom<{ data: DashboardStats }>({
    url: 'rest/v1/rpc/get_dashboard_stats',
    method: 'get',
    config: {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage?.getItem('sb-access-token') || '' : ''}`,
      },
    },
  });

  useEffect(() => {
    if (data?.data?.data) {
      setStats(data.data.data);
    }
  }, [data]);

  if (isLoading || !stats) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Authenticated key="dashboard" fallback={<div>Loading or redirecting...</div>}>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
          <Typography variant="h4" fontWeight="bold">
            UniRide Admin Dashboard
          </Typography>
          <button
            onClick={() => logout()}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Users" value={stats.total_users} color="#007AFF" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Active Drivers" value={stats.total_drivers} color="#34C759" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Active Routes" value={stats.active_routes} color="#5856D6" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Active Trips" value={stats.active_trips} color="#FF9500" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Routes" value={stats.total_routes} color="#007AFF" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Trips" value={stats.total_trips} color="#34C759" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Active Subscriptions" value={stats.active_subscriptions} color="#5856D6" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Monthly Revenue (IQD)" value={stats.monthly_revenue.toLocaleString()} color="#FF9500" />
          </Grid>
        </Grid>

        {stats.active_trips > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Live Trips
            </Typography>
            <Card>
              <CardContent>
                <Typography color="textSecondary">
                  {stats.active_trips} trip(s) currently active. View details in the Trips section.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Authenticated>
  );
}