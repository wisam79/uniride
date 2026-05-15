'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Switch, Chip, Alert, IconButton, Tooltip, Stack } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '../../providers/supabaseClient';

interface DriverRow {
  id: string;
  user_id: string;
  license_number: string;
  vehicle_model: string;
  vehicle_plate: string;
  capacity: number;
  is_verified: boolean;
  full_name: string;
  phone: string;
  created_at: string;
}

export default function DriverList() {
  const router = useRouter();
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const { t } = useTranslation();

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // ✅ جلب من جدول drivers مع join على profiles لعرض الاسم والهاتف
      const {
        data,
        error: fetchError,
        count,
      } = await supabaseClient
        .from('drivers')
        .select(
          `
          id,
          user_id,
          license_number,
          vehicle_model,
          vehicle_plate,
          capacity,
          created_at,
          profiles!drivers_user_id_fkey(full_name, phone, is_verified)
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (fetchError) throw fetchError;

      const mapped: DriverRow[] = (data || []).map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        license_number: d.license_number ?? '—',
        vehicle_model: d.vehicle_model ?? '—',
        vehicle_plate: d.vehicle_plate ?? '—',
        capacity: d.capacity ?? 0,
        is_verified: !!(Array.isArray(d.profiles)
          ? d.profiles[0]?.is_verified
          : d.profiles?.is_verified),
        created_at: d.created_at,
        full_name:
          (Array.isArray(d.profiles) ? d.profiles[0]?.full_name : d.profiles?.full_name) ?? '—',
        phone: (Array.isArray(d.profiles) ? d.profiles[0]?.phone : d.profiles?.phone) ?? '—',
      }));

      setRows(mapped);
      setTotal(count ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load drivers');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleVerifyToggle = async (driverId: string, userId: string, currentStatus: boolean) => {
    setTogglingId(driverId);
    try {
      // ✅ تحديث is_verified في profiles (حيث يوجد الحقل فعلياً)
      const { error } = await supabaseClient
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);
      if (error) throw error;

      setRows((prev) =>
        prev.map((r) => (r.id === driverId ? { ...r, is_verified: !currentStatus } : r)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update verification');
    } finally {
      setTogglingId(null);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'full_name',
      headerName: t('drivers.fields.driverName'),
      minWidth: 180,
      flex: 1,
    },
    {
      field: 'phone',
      headerName: t('drivers.fields.phone'),
      minWidth: 140,
      flex: 0.8,
    },
    {
      field: 'license_number',
      headerName: t('drivers.fields.licenseNumber'),
      minWidth: 140,
      flex: 0.8,
    },
    {
      field: 'vehicle_model',
      headerName: t('drivers.fields.vehicle'),
      minWidth: 140,
      flex: 0.8,
    },
    {
      field: 'vehicle_plate',
      headerName: t('drivers.fields.plate'),
      minWidth: 110,
      flex: 0.6,
    },
    {
      field: 'capacity',
      headerName: t('drivers.fields.capacity'),
      type: 'number',
      minWidth: 90,
      flex: 0.5,
    },
    {
      field: 'is_verified',
      headerName: t('drivers.fields.verified'),
      minWidth: 120,
      flex: 0.6,
      renderCell: ({ row }) => (
        <Switch
          checked={!!row.is_verified}
          onChange={() => handleVerifyToggle(row.id, row.user_id, !!row.is_verified)}
          disabled={togglingId === row.id}
          color="success"
          size="small"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: t('drivers.fields.registered'),
      minWidth: 140,
      flex: 0.8,
      renderCell: ({ value }) => (value ? new Date(value).toLocaleDateString('ar-IQ') : '—'),
    },
    {
      field: 'actions',
      headerName: t('actions.actions'),
      sortable: false,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center" height="100%">
          <Tooltip title="Edit Driver">
            <span>
              <IconButton size="small" onClick={() => router.push(`/drivers/edit/${row.id}`)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {t('drivers.titles.list')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Add Driver">
            <IconButton color="primary" onClick={() => router.push('/drivers/create')}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchDrivers} disabled={isLoading} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
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
