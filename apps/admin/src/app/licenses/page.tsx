'use client';

import { useDataGrid, List, DateField } from '@refinedev/mui';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import React, { useState } from 'react';
import { Chip, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useList } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

type LicenseStatus = 'active' | 'used' | 'revoked';

export default function LicensesList() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<LicenseStatus | 'all'>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');

  // Fetch batches for the dropdown filter
  const { data: batchesData } = useList({
    resource: 'license_batches',
    pagination: { pageSize: 100 },
    sorters: [{ field: 'created_at', order: 'desc' }],
  });

  const filters: Array<{ field: string; operator: 'eq'; value: string }> = [];
  if (statusFilter !== 'all') {
    filters.push({ field: 'status', operator: 'eq' as const, value: statusFilter });
  }
  if (batchFilter !== 'all') {
    filters.push({ field: 'batch_id', operator: 'eq' as const, value: batchFilter });
  }

  const { dataGridProps } = useDataGrid({
    resource: 'licenses',
    sorters: {
      initial: [{ field: 'created_at', order: 'desc' }],
    },
    filters: {
      permanent: filters,
    },
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'code',
        headerName: t('licenses.fields.code'),
        type: 'string',
        minWidth: 150,
        flex: 1,
        renderCell: ({ value }) => (
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 2 }}>
            {value}
          </span>
        ),
      },
      {
        field: 'status',
        headerName: t('licenses.fields.status'),
        type: 'string',
        minWidth: 120,
        flex: 0.7,
        renderCell: function render({ value }) {
          const colorMap: Record<LicenseStatus, 'success' | 'default' | 'error'> = {
            active: 'success',
            used: 'default',
            revoked: 'error',
          };
          return (
            <Chip
              size="small"
              label={value}
              color={colorMap[value as LicenseStatus] ?? 'default'}
            />
          );
        },
      },
      {
        field: 'validDays',
        headerName: t('licenses.fields.validDays'),
        type: 'number',
        minWidth: 100,
        flex: 0.6,
      },
      {
        field: 'usedAt',
        headerName: t('licenses.fields.usedAt'),
        minWidth: 180,
        flex: 1,
        renderCell: function render({ value }) {
          if (!value) return '-';
          return <DateField value={value} />;
        },
      },
      {
        field: 'createdAt',
        headerName: t('licenses.fields.createdAt'),
        minWidth: 180,
        flex: 1,
        renderCell: function render({ value }) {
          return <DateField value={value} />;
        },
      },
    ],
    [t],
  );

  return (
    <List>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('licenses.fields.status')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('licenses.fields.status')}
            onChange={(e) => setStatusFilter(e.target.value as LicenseStatus | 'all')}
          >
            <MenuItem value="all">{t('trips.all_statuses')}</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="used">Used</MenuItem>
            <MenuItem value="revoked">Revoked</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('license_batches.titles.show')}</InputLabel>
          <Select
            value={batchFilter}
            label={t('license_batches.titles.show')}
            onChange={(e) => setBatchFilter(e.target.value)}
          >
            <MenuItem value="all">All Batches</MenuItem>
            {batchesData?.data?.map((batch: any) => (
              <MenuItem key={batch.id} value={batch.id}>
                {batch.batchName ?? batch.batch_name ?? batch.id.slice(0, 8)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <DataGrid
        {...dataGridProps}
        columns={columns}
        autoHeight
        components={{ Toolbar: GridToolbar }}
        componentsProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 300 },
          },
        }}
      />
    </List>
  );
}
