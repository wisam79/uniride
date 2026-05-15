'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Chip, Alert, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { supabaseClient } from '../../providers/supabaseClient';

interface AuditLogRow {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource: string;
  resource_id: string;
  details: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        data,
        error: fetchError,
        count,
      } = await supabaseClient
        .from('audit_logs')
        .select(
          `
          id,
          user_id,
          action,
          resource,
          resource_id,
          details,
          created_at,
          profiles!audit_logs_user_id_fkey(full_name)
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (fetchError) throw fetchError;

      const mapped: AuditLogRow[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        user_name:
          (Array.isArray(row.profiles) ? row.profiles[0]?.full_name : row.profiles?.full_name) ??
          row.user_id ??
          'System',
        action: row.action,
        resource: row.resource,
        resource_id: row.resource_id,
        details:
          typeof row.details === 'object' && row.details !== null
            ? JSON.stringify(row.details)
            : String(row.details || ''),
        created_at: row.created_at,
      }));

      setRows(mapped);
      setTotal(count ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: GridColDef[] = [
    {
      field: 'user_name',
      headerName: t('audit_logs.fields.user'),
      minWidth: 180,
      flex: 1,
    },
    {
      field: 'action',
      headerName: t('audit_logs.fields.action'),
      minWidth: 150,
      flex: 1,
      renderCell: ({ value }) => (
        <Chip
          label={value}
          color={value.includes('DELETE') ? 'error' : value.includes('UPDATE') ? 'warning' : 'info'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'resource',
      headerName: t('audit_logs.fields.resource'),
      minWidth: 150,
      flex: 1,
    },
    {
      field: 'resource_id',
      headerName: t('audit_logs.fields.resourceId'),
      minWidth: 200,
      flex: 1,
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {value || '—'}
        </Typography>
      ),
    },
    {
      field: 'details',
      headerName: t('audit_logs.fields.details'),
      minWidth: 250,
      flex: 2,
      renderCell: ({ value }) => (
        <Tooltip title={value}>
          <Typography
            variant="body2"
            noWrap
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}
          >
            {value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'created_at',
      headerName: t('audit_logs.fields.createdAt'),
      minWidth: 160,
      flex: 1,
      renderCell: ({ value }) => (value ? new Date(value).toLocaleString() : '—'),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {t('audit_logs.titles.list')}
        </Typography>
        <Tooltip title={t('dashboard.refresh')}>
          <span>
            <IconButton onClick={fetchLogs} disabled={isLoading} color="primary">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
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
