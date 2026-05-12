'use client';

import { useMany } from '@refinedev/core';
import { List, useDataGrid, DateField, EditButton, ShowButton } from '@refinedev/mui';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';
import { Stack, Chip } from '@mui/material';

const STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'
> = {
  scheduled: 'warning',
  driver_waiting: 'info',
  in_transit: 'primary',
  completed: 'success',
  absent: 'default',
  cancelled: 'error',
};

export default function TripList() {
  const { dataGridProps } = useDataGrid({
    resource: 'trips',
  });

  const { data: routeData, isLoading: routeIsLoading } = useMany({
    resource: 'routes',
    ids: dataGridProps?.rows?.map((item: any) => item?.route_id).filter(Boolean) ?? [],
    queryOptions: {
      enabled: !!dataGridProps?.rows,
    },
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        type: 'string',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'route_id',
        headerName: 'Route',
        type: 'string',
        minWidth: 200,
        flex: 1,
        renderCell: function render({ value }) {
          if (routeIsLoading) return <>Loading...</>;
          const route = routeData?.data?.find((item) => item.id === value);
          return route ? route.title : value;
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        type: 'string',
        minWidth: 150,
        flex: 1,
        renderCell: function render({ value }) {
          return (
            <Chip
              label={value?.replace('_', ' ')}
              color={STATUS_COLORS[value] || 'default'}
              size="small"
            />
          );
        },
      },
      {
        field: 'scheduled_at',
        headerName: 'Scheduled',
        minWidth: 180,
        flex: 1,
        renderCell: function render({ value }) {
          return value ? new Date(value).toLocaleString() : '-';
        },
      },
      {
        field: 'started_at',
        headerName: 'Started',
        minWidth: 180,
        flex: 1,
        renderCell: function render({ value }) {
          return value ? new Date(value).toLocaleString() : '-';
        },
      },
      {
        field: 'ended_at',
        headerName: 'Ended',
        minWidth: 180,
        flex: 1,
        renderCell: function render({ value }) {
          return value ? new Date(value).toLocaleString() : '-';
        },
      },
      {
        field: 'last_lat',
        headerName: 'Lat',
        type: 'string',
        minWidth: 100,
        flex: 0.5,
        renderCell: function render({ value }) {
          return value ? parseFloat(value).toFixed(4) : '-';
        },
      },
      {
        field: 'last_lng',
        headerName: 'Lng',
        type: 'string',
        minWidth: 100,
        flex: 0.5,
        renderCell: function render({ value }) {
          return value ? parseFloat(value).toFixed(4) : '-';
        },
      },
    ],
    [routeData?.data, routeIsLoading],
  );

  return (
    <List>
      <DataGrid {...dataGridProps} columns={columns} autoHeight />
    </List>
  );
}
