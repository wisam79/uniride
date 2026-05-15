'use client';

import { List, useDataGrid, DateField, EditButton, ShowButton } from '@refinedev/mui';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';
import { Chip, Stack, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'
> = {
  scheduled: 'default',
  driver_waiting: 'warning',
  in_transit: 'primary',
  completed: 'success',
  absent: 'error',
  cancelled: 'error',
};

export default function TripList() {
  const { t } = useTranslation();
  const { dataGridProps } = useDataGrid({
    resource: 'trips',
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'id',
        headerName: t('trips.fields.id'),
        type: 'string',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'routeId',
        headerName: t('trips.fields.route'),
        type: 'string',
        minWidth: 150,
        flex: 1,
      },
      {
        field: 'driverId',
        headerName: t('trips.fields.driver'),
        type: 'string',
        minWidth: 150,
        flex: 1,
      },
      {
        field: 'status',
        headerName: t('trips.fields.status'),
        type: 'string',
        minWidth: 120,
        flex: 1,
        renderCell: function render({ value }) {
          return (
            <Chip
              label={t(value)}
              color={STATUS_COLORS[value] || 'default'}
              size="small"
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'scheduledAt',
        headerName: t('trips.fields.scheduledAt'),
        minWidth: 180,
        flex: 1,
        renderCell: function render({ value }) {
          return value ? new Date(value).toLocaleString() : '-';
        },
      },
      {
        field: 'startedAt',
        headerName: t('trips.fields.startedAt'),
        minWidth: 180,
        flex: 1,
        renderCell: function render({ value }) {
          return value ? new Date(value).toLocaleString() : '-';
        },
      },
      {
        field: 'actions',
        headerName: t('trips.fields.actions'),
        sortable: false,
        renderCell: function render({ row }) {
          return (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              height="100%"
            >
              <ShowButton hideText recordItemId={row.id} />
              <EditButton hideText recordItemId={row.id} />
            </Stack>
          );
        },
        align: 'center',
        headerAlign: 'center',
        minWidth: 120,
      },
    ],
    [t],
  );

  return (
    <List>
      <DataGrid {...dataGridProps} columns={columns} autoHeight />
    </List>
  );
}
