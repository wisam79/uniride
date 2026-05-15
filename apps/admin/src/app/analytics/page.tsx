'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '../../providers/supabaseClient';
import { useTranslation } from 'react-i18next';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Bus,
  Users,
  CreditCard,
  Star,
  TrendingUp,
  XCircle,
  RefreshCw,
  BarChart2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

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

interface SlowQuery {
  id: number;
  query: string;
  calls: number;
  mean_exec_time: number;
  total_exec_time: number;
  rows: number;
}

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#AF52DE'];

function KpiCard({
  icon: Icon,
  label,
  value,
  color = '#007AFF',
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              backgroundColor: `${color}15`,
              color,
              display: 'flex',
            }}
          >
            <Icon size={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const defaultEnd = new Date();
  const defaultStart = new Date(defaultEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(toDateInputValue(defaultStart));
  const [endDate, setEndDate] = useState(toDateInputValue(defaultEnd));
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [queryMonitoringAvailable, setQueryMonitoringAvailable] = useState(true);
  const [slowQueriesLoading, setSlowQueriesLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabaseClient.rpc('get_analytics_summary', {
        p_start_date: new Date(startDate).toISOString(),
        p_end_date: new Date(endDate + 'T23:59:59').toISOString(),
      });
      if (rpcError) throw rpcError;
      setData(result as AnalyticsSummary);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  const fetchSlowQueries = useCallback(async () => {
    setSlowQueriesLoading(true);
    try {
      const { data: qData, error: qError } = await supabaseClient.rpc('get_slow_queries', {
        p_limit: 20,
      });
      if (qError) {
        setQueryMonitoringAvailable(false);
        return;
      }
      setSlowQueries(
        (qData ?? []).map((row: Omit<SlowQuery, 'id'>, idx: number) => ({ ...row, id: idx })),
      );
      setQueryMonitoringAvailable(true);
    } catch {
      setQueryMonitoringAvailable(false);
    } finally {
      setSlowQueriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchSlowQueries();
  }, [fetchAnalytics, fetchSlowQueries]);

  if (isLoading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress thickness={5} size={60} sx={{ color: '#007AFF' }} />
      </Box>
    );
  }

  const pieData = data
    ? Object.entries(data.trips_by_status).map(([name, value]) => ({
        name: t(name) || name.replace('_', ' '),
        value,
      }))
    : [];

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {t('analytics.title')}
        </Typography>
        <Tooltip title={t('dashboard.refresh')}>
          <IconButton onClick={fetchAnalytics} disabled={isLoading} color="primary">
            <RefreshCw size={24} className={isLoading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 100 }}>
            {t('analytics.date_range')}
          </Typography>
          <TextField
            label={t('from')}
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t('to')}
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <Button
            variant="contained"
            disableElevation
            onClick={fetchAnalytics}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {t('analytics.apply')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setStartDate(toDateInputValue(defaultStart));
              setEndDate(toDateInputValue(defaultEnd));
            }}
            sx={{ borderRadius: 2 }}
          >
            {t('analytics.reset')}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {data && (
        <>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                icon={Bus}
                label={t('analytics.kpis.total_trips')}
                value={data.total_trips}
                color="#007AFF"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                icon={Users}
                label={t('analytics.kpis.active_students')}
                value={data.active_students}
                color="#34C759"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                icon={CreditCard}
                label={t('analytics.kpis.revenue')}
                value={data.total_revenue.toLocaleString()}
                color="#FF9500"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                icon={Star}
                label={t('analytics.kpis.avg_rating')}
                value={data.avg_rating ? `${data.avg_rating} / 5` : 'N/A'}
                color="#AF52DE"
              />
            </Grid>
          </Grid>

          <Grid container spacing={4} mb={4}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                  <PieChartIcon size={20} color="#007AFF" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('analytics.outcomes.title')}
                  </Typography>
                </Box>
                <Box sx={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                  <BarChart2 size={20} color="#34C759" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('dashboard.charts.top_routes')}
                  </Typography>
                </Box>
                <Box sx={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.top_routes.slice(0, 5)}
                      layout="vertical"
                      margin={{ left: 40, right: 40 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="title"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={100}
                        tick={{ fontSize: 11, fontWeight: 600 }}
                      />
                      <RechartsTooltip />
                      <Bar
                        dataKey="subscriptions"
                        fill="#34C759"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Box mb={4}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
              {t('analytics.performance.title')}
            </Typography>
            {!queryMonitoringAvailable ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {t('analytics.performance.not_available')}
              </Alert>
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <DataGrid
                  rows={slowQueries}
                  loading={slowQueriesLoading}
                  autoHeight
                  columns={
                    [
                      {
                        field: 'query',
                        headerName: t('analytics.performance.query'),
                        flex: 3,
                        renderCell: (params) => (
                          <Tooltip title={params.value as string}>
                            <Typography variant="body2" noWrap>
                              {params.value as string}
                            </Typography>
                          </Tooltip>
                        ),
                      },
                      {
                        field: 'calls',
                        headerName: t('analytics.performance.calls'),
                        width: 100,
                        type: 'number',
                      },
                      {
                        field: 'mean_exec_time',
                        headerName: t('analytics.performance.avg_ms'),
                        width: 120,
                        type: 'number',
                        valueFormatter: (value: number) => value?.toFixed(2),
                      },
                      {
                        field: 'total_exec_time',
                        headerName: t('analytics.performance.total_ms'),
                        width: 130,
                        type: 'number',
                        valueFormatter: (value: number) => value?.toFixed(2),
                      },
                      {
                        field: 'rows',
                        headerName: t('analytics.performance.rows'),
                        width: 100,
                        type: 'number',
                      },
                    ] as GridColDef[]
                  }
                  rowsPerPageOptions={[5, 10]}
                  initialState={{ pagination: { pageSize: 5 } }}
                  disableSelectionOnClick
                  sx={{ border: 'none' }}
                />
              </Paper>
            )}
          </Box>
        </>
      )}

      <style jsx global>{`
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
