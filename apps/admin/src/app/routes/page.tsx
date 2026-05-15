'use client';

import { useMany } from '@refinedev/core';
import { List, useDataGrid, DateField, EditButton, ShowButton } from '@refinedev/mui';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';
import { Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function RouteList() {
  const { t } = useTranslation();
  const { dataGridProps } = useDataGrid({
    resource: 'routes',
  });

  const { data: driverData, isLoading: driverIsLoading } = useMany({
    resource: 'drivers',
    ids: dataGridProps?.rows?.map((item: any) => item?.driverId).filter(Boolean) ?? [],
    queryOptions: {
      enabled: !!dataGridProps?.rows,
    },
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'id',
        headerName: t('routes.fields.id'),
        type: 'string',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'title',
        headerName: t('routes.fields.title'),
        type: 'string',
        minWidth: 150,
        flex: 1,
      },
      {
        field: 'driverId',
        headerName: t('routes.fields.driver'),
        type: 'string',
        minWidth: 200,
        flex: 1,
        renderCell: function render({ value }) {
          if (driverIsLoading) {
            return <>{t('loading')}</>;
          }

          const driver = driverData?.data?.find((item) => item.id === value);
          return driver ? (driver.fullName ?? driver.licenseNumber ?? value) : value;
        },
      },
      {
        field: 'startLocation',
        headerName: t('routes.fields.startLocation'),
        type: 'string',
        minWidth: 150,
        flex: 1,
      },
      {
        field: 'endLocation',
        headerName: t('routes.fields.endLocation'),
        type: 'string',
        minWidth: 150,
        flex: 1,
      },
      {
        field: 'price',
        headerName: t('routes.fields.price'),
        type: 'number',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'capacity',
        headerName: t('routes.fields.capacity'),
        type: 'number',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'availableSeats',
        headerName: t('routes.fields.availableSeats'),
        type: 'number',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'isActive',
        headerName: t('routes.fields.active'),
        type: 'boolean',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'actions',
        headerName: t('routes.fields.actions'),
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
              <EditButton hideText recordItemId={row.id} />
              <ShowButton hideText recordItemId={row.id} />
            </Stack>
          );
        },
        align: 'center',
        headerAlign: 'center',
        minWidth: 120,
      },
    ],
    [driverData?.data, driverIsLoading],
  );

  return (
    <List>
      <DataGrid {...dataGridProps} columns={columns} autoHeight />
    </List>
  );
}
