'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '../../providers/supabaseClient';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { DirectionsBus, People, AttachMoney, Star, TrendingUp, Cancel } from '@mui/icons-material';

interface AnalyticsSummary {
  total_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  total_revenue: number;
  active_students: number;
  active_drivers: number;
  avg_rating: number | null;
  trips_by_status: Record<string, number>;
  top_routes: Array<{
    title: string;
    subscriptions: number;
    price: number;
    revenue: number;
  }>;
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

function KpiCard({ icon, label, value, color = '#1976d2' }: KpiCardProps) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: `${color}18`,
              color,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const { data: result, error: rpcError } = await supabaseClient.rpc('get_analytics_summary');
        if (rpcError) throw rpcError;
        setData(result as AnalyticsSummary);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const completionRate =
    data.total_trips > 0 ? ((data.completed_trips / data.total_trips) * 100).toFixed(1) : '0';

  const cancellationRate =
    data.total_trips > 0 ? ((data.cancelled_trips / data.total_trips) * 100).toFixed(1) : '0';

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Analytics — Last 30 Days
      </Typography>

      {/* KPI Row */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<DirectionsBus />}
            label="Total Trips"
            value={data.total_trips}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<People />}
            label="Active Students"
            value={data.active_students}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<AttachMoney />}
            label="Revenue (IQD)"
            value={data.total_revenue.toLocaleString()}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<Star />}
            label="Avg Rating"
            value={data.avg_rating ? `${data.avg_rating} / 5` : 'N/A'}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* Second Row */}
      <Grid container spacing={3}>
        {/* Completion & Cancellation */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trip Outcomes
              </Typography>
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUp color="success" />
                    <Typography variant="body2">Completion Rate</Typography>
                  </Box>
                  <Chip label={`${completionRate}%`} color="success" size="small" />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Cancel color="error" />
                    <Typography variant="body2">Cancellation Rate</Typography>
                  </Box>
                  <Chip label={`${cancellationRate}%`} color="error" size="small" />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    <DirectionsBus color="primary" />
                    <Typography variant="body2">Active Drivers</Typography>
                  </Box>
                  <Chip label={data.active_drivers} color="primary" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Trips by Status */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trips by Status
              </Typography>
              {data.trips_by_status &&
                Object.entries(data.trips_by_status).map(([status, count]) => (
                  <Box
                    key={status}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={0.75}
                    borderBottom="1px solid #f0f0f0"
                  >
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {status.replace('_', ' ')}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {count}
                    </Typography>
                  </Box>
                ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Routes */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Routes
              </Typography>
              {data.top_routes?.slice(0, 7).map((route, index) => (
                <Box
                  key={index}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  py={0.75}
                  borderBottom="1px solid #f0f0f0"
                >
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: '60%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {route.title}
                  </Typography>
                  <Chip label={`${route.subscriptions} subs`} size="small" variant="outlined" />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
