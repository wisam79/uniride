'use client';

import { useEffect, useState, useCallback } from 'react';
import { Authenticated } from '@refinedev/core';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Fade,
  Paper,
  Divider,
} from '@mui/material';
import {
  RefreshCw,
  Users,
  Bus,
  MapPin,
  Activity,
  Layers,
  Clock,
  CreditCard,
  TrendingUp,
  Circle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { supabaseClient } from '../providers/supabaseClient';

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

interface ActivityData {
  day: string;
  count: number;
}

interface RecentTrip {
  id: string;
  status: string;
  scheduled_at: string;
  route_title: string;
  driver_name: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: string;
}) {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          right: -10,
          opacity: 0.1,
          transform: 'rotate(15deg)',
        }}
      >
        <Icon size={80} color={color} />
      </Box>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <Box
            sx={{
              p: 1,
              borderRadius: '12px',
              backgroundColor: `${color}15`,
              color: color,
              display: 'flex',
            }}
          >
            <Icon size={20} />
          </Box>
          <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        {trend && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <TrendingUp size={14} color="#34C759" />
            <Typography variant="caption" sx={{ color: '#34C759', fontWeight: 600 }}>
              {trend}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting',
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, activityRes, recentRes] = await Promise.all([
        supabaseClient.rpc('get_dashboard_stats'),
        supabaseClient.rpc('get_daily_activity', { p_days: 7 }),
        supabaseClient.rpc('get_recent_active_trips', { p_limit: 5 }),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (statsRes.data) setStats(statsRes.data as DashboardStats);

      if (activityRes.data) setActivity(activityRes.data as ActivityData[]);
      if (recentRes.data) setRecentTrips(recentRes.data as RecentTrip[]);

      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabaseClient
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        // Debounced refresh or just re-fetch for now
        fetchData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        if (status === 'CLOSED') setRealtimeStatus('disconnected');
      });

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [fetchData]);

  if (isLoading && !stats) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}
      >
        <CircularProgress thickness={5} size={60} sx={{ color: '#007AFF' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
            {t('dashboard.title')}
          </Typography>
          <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Circle
                size={8}
                fill={realtimeStatus === 'connected' ? '#34C759' : '#FF3B30'}
                color={realtimeStatus === 'connected' ? '#34C759' : '#FF3B30'}
                style={{ animation: realtimeStatus === 'connected' ? 'pulse 2s infinite' : 'none' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t(`dashboard.realtime.${realtimeStatus}`)}
              </Typography>
            </Box>
            {lastUpdated && (
              <>
                <Divider orientation="vertical" flexItem sx={{ height: 12, my: 'auto' }} />
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.last_updated', { time: lastUpdated.toLocaleTimeString() })}
                </Typography>
              </>
            )}
          </Box>
        </Box>
        <Tooltip title={t('dashboard.refresh')}>
          <IconButton
            onClick={fetchData}
            disabled={isLoading}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': { backgroundColor: '#f0f0f0' },
            }}
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.stats.total_users')}
              value={stats.total_users}
              icon={Users}
              color="#007AFF"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.stats.active_drivers')}
              value={stats.total_drivers}
              icon={Bus}
              color="#34C759"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.stats.active_subscriptions')}
              value={stats.active_subscriptions}
              icon={Layers}
              color="#5856D6"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.stats.monthly_revenue')}
              value={stats.monthly_revenue.toLocaleString()}
              icon={CreditCard}
              color="#FF9500"
            />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }} elevation={0} variant="outlined">
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              {t('dashboard.charts.trips_activity')}
            </Typography>
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#8E8E93' }}
                    dy={10}
                    tickFormatter={(val) =>
                      new Date(val).toLocaleDateString(undefined, { weekday: 'short' })
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#8E8E93' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#007AFF"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }} elevation={0} variant="outlined">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t('dashboard.realtime.live')}
              </Typography>
              <Activity size={20} color="#FF3B30" />
            </Box>

            {recentTrips.length > 0 ? (
              <Box display="flex" flexDirection="column" gap={2}>
                {recentTrips.map((trip) => (
                  <Box
                    key={trip.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: '#F2F2F7',
                      border: '1px solid #E5E5EA',
                    }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {trip.route_title}
                      </Typography>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          backgroundColor: trip.status === 'in_transit' ? '#34C75920' : '#FF950020',
                          color: trip.status === 'in_transit' ? '#34C759' : '#FF9500',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        {t(trip.status)}
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                      <Bus size={14} />
                      <Typography variant="caption">{trip.driver_name}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} color="text.secondary" mt={0.5}>
                      <Clock size={14} />
                      <Typography variant="caption">
                        {new Date(trip.scheduled_at).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 240,
                  opacity: 0.5,
                }}
              >
                <Activity size={40} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {t('no_active_trips')}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Box>
  );
}

export default function Page() {
  return (
    <Authenticated
      key="dashboard"
      fallback={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
          }}
        >
          <CircularProgress thickness={5} size={60} sx={{ color: '#007AFF' }} />
        </Box>
      }
    >
      <DashboardContent />
    </Authenticated>
  );
}
