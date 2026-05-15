'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';
import { supabaseClient } from '../../providers/supabaseClient';

interface PayoutRow {
  id: string;
  driver_id: string;
  driver_name: string;
  phone: string;
  amount: number;
  status: string;
  reference_note: string;
  created_at: string;
}

export default function PayoutsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    type: 'completed' | 'rejected';
    payoutId: string | null;
  }>({ isOpen: false, type: 'completed', payoutId: null });
  const [referenceNote, setReferenceNote] = useState('');

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabaseClient
        .from('driver_payouts')
        .select(
          `
          id,
          driver_id,
          amount,
          status,
          reference_note,
          created_at,
          drivers!inner(user_id, profiles!drivers_user_id_fkey(full_name, phone))
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

      const mapped: PayoutRow[] = (data || []).map((row: any) => {
        const profile = Array.isArray(row.drivers?.profiles)
          ? row.drivers?.profiles[0]
          : row.drivers?.profiles;
        return {
          id: row.id,
          driver_id: row.driver_id,
          driver_name: profile?.full_name || 'Unknown',
          phone: profile?.phone || 'Unknown',
          amount: row.amount,
          status: row.status,
          reference_note: row.reference_note || '',
          created_at: row.created_at,
        };
      });

      setRows(mapped);
      setTotal(count ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load payouts');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleActionSubmit = async () => {
    if (!actionDialog.payoutId) return;
    try {
      const { error: updateError } = await supabaseClient.rpc('process_payout', {
        p_payout_id: actionDialog.payoutId,
        p_new_status: actionDialog.type,
        p_reference_note: referenceNote.trim(),
      });

      if (updateError) throw updateError;

      setRows((prev) =>
        prev.map((r) =>
          r.id === actionDialog.payoutId
            ? { ...r, status: actionDialog.type, reference_note: referenceNote.trim() }
            : r,
        ),
      );
      setActionDialog({ isOpen: false, type: 'completed', payoutId: null });
      setReferenceNote('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update payout status');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'driver_name',
      headerName: t('payouts.fields.driverName'),
      minWidth: 180,
      flex: 1,
    },
    {
      field: 'phone',
      headerName: t('payouts.fields.phone'),
      minWidth: 150,
      flex: 1,
    },
    {
      field: 'amount',
      headerName: t('payouts.fields.amount'),
      minWidth: 120,
      flex: 1,
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {Number(value).toLocaleString()} {t('currency')}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: t('payouts.fields.status'),
      minWidth: 120,
      flex: 1,
      renderCell: ({ value }) => (
        <Chip
          label={t(`payouts.status.${value}`) || value}
          color={value === 'completed' ? 'success' : value === 'rejected' ? 'error' : 'warning'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'reference_note',
      headerName: t('payouts.fields.referenceNote'),
      minWidth: 150,
      flex: 1.5,
    },
    {
      field: 'created_at',
      headerName: t('payouts.fields.createdAt'),
      minWidth: 160,
      flex: 1,
      renderCell: ({ value }) => (value ? new Date(value).toLocaleString() : '—'),
    },
    {
      field: 'actions',
      headerName: t('actions.actions'),
      sortable: false,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) =>
        row.status === 'pending' ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <Tooltip title={t('payouts.actions.approve')}>
              <span>
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => {
                    setActionDialog({ isOpen: true, type: 'completed', payoutId: row.id });
                    setReferenceNote('');
                  }}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('payouts.actions.reject')}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setActionDialog({ isOpen: true, type: 'rejected', payoutId: row.id });
                    setReferenceNote('');
                  }}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ) : null,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {t('payouts.titles.list')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('payouts.fields.status')}</InputLabel>
            <Select
              value={statusFilter}
              label={t('payouts.fields.status')}
              onChange={(e) => {
                setStatusFilter(e.target.value as string);
                setPage(0);
              }}
            >
              <MenuItem value="all">{t('trips.all_statuses')}</MenuItem>
              <MenuItem value="pending">{t('payouts.status.pending')}</MenuItem>
              <MenuItem value="completed">{t('payouts.status.completed')}</MenuItem>
              <MenuItem value="rejected">{t('payouts.status.rejected')}</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title={t('dashboard.refresh')}>
            <IconButton onClick={fetchPayouts} disabled={isLoading} color="primary">
              <RefreshIcon />
            </IconButton>
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

      <Dialog
        open={actionDialog.isOpen}
        onClose={() => setActionDialog({ ...actionDialog, isOpen: false })}
      >
        <DialogTitle>
          {actionDialog.type === 'completed'
            ? t('payouts.actions.approve')
            : t('payouts.actions.reject')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>{t('are_you_sure')}</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={t('payouts.fields.referenceNote')}
            fullWidth
            variant="outlined"
            value={referenceNote}
            onChange={(e) => setReferenceNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setActionDialog({ ...actionDialog, isOpen: false })}
            color="inherit"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleActionSubmit}
            variant="contained"
            color={actionDialog.type === 'completed' ? 'success' : 'error'}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
