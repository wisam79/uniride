'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { supabaseClient } from '../../providers/supabaseClient';

type SubStatus = 'active' | 'pending' | 'expired' | 'cancelled';

interface SubRow {
  id: string;
  status: SubStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  student_name: string;
  route_title: string;
}

const STATUS_COLORS: Record<SubStatus, 'success' | 'warning' | 'default' | 'error'> = {
  active: 'success',
  pending: 'warning',
  expired: 'default',
  cancelled: 'error',
};

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SubRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const fetchSubs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabaseClient
        .from('subscriptions')
        .select(
          `
          id,
          status,
          start_date,
          end_date,
          created_at,
          profiles!subscriptions_student_id_fkey(full_name),
          routes!subscriptions_route_id_fkey(title)
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      const mapped: SubRow[] = (data || []).map((s: any) => ({
        id: s.id,
        status: s.status,
        start_date: s.start_date,
        end_date: s.end_date,
        created_at: s.created_at,
        student_name:
          (Array.isArray(s.profiles) ? s.profiles[0]?.full_name : s.profiles?.full_name) ?? '—',
        route_title: (Array.isArray(s.routes) ? s.routes[0]?.title : s.routes?.title) ?? '—',
      }));

      setRows(mapped);
      setTotal(count ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page, pageSize]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const columns: GridColDef[] = [
    {
      field: 'student_name',
      headerName: t('subscriptions.fields.student'),
      minWidth: 180,
      flex: 1,
    },
    {
      field: 'route_title',
      headerName: t('subscriptions.fields.route'),
      minWidth: 180,
      flex: 1,
    },
    {
      field: 'status',
      headerName: t('subscriptions.fields.status'),
      minWidth: 120,
      flex: 0.7,
      renderCell: ({ value }) => (
        <Chip
          label={t(`subscription_${value}`) || value}
          color={STATUS_COLORS[value as SubStatus] ?? 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'start_date',
      headerName: t('subscriptions.fields.startDate'),
      minWidth: 140,
      flex: 0.8,
      renderCell: ({ value }) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
    {
      field: 'end_date',
      headerName: t('subscriptions.fields.endDate'),
      minWidth: 140,
      flex: 0.8,
      renderCell: ({ value }) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
    {
      field: 'created_at',
      headerName: t('subscriptions.fields.createdAt'),
      minWidth: 160,
      flex: 0.9,
      renderCell: ({ value }) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {t('subscriptions.titles.list')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('subscriptions.fields.status')}</InputLabel>
            <Select
              value={statusFilter}
              label={t('subscriptions.fields.status')}
              onChange={(e) => {
                setStatusFilter(e.target.value as SubStatus | 'all');
                setPage(0);
              }}
            >
              <MenuItem value="all">{t('trips.all_statuses')}</MenuItem>
              <MenuItem value="active">{t('subscription_active')}</MenuItem>
              <MenuItem value="pending">{t('subscription_pending')}</MenuItem>
              <MenuItem value="expired">{t('subscription_expired')}</MenuItem>
              <MenuItem value="cancelled">{t('subscription_cancelled')}</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title={t('dashboard.refresh')}>
            <span>
              <IconButton onClick={fetchSubs} disabled={isLoading} color="primary">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowCount={total}
        paginationMode="server"
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(ps) => setPageSize(ps)}
        rowsPerPageOptions={[10, 25, 50]}
        autoHeight
        disableSelectionOnClick
      />
    </Box>
  );
}
