'use client';

import { List, useDataGrid, DateField } from '@refinedev/mui';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';
import { useMany } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

export default function LicenseBatchesList() {
  const { t } = useTranslation();
  const { dataGridProps } = useDataGrid({
    resource: 'license_batches',
    sorters: {
      initial: [
        {
          field: 'created_at',
          order: 'desc',
        },
      ],
    },
  });

  const { data: routesData, isLoading: routesIsLoading } = useMany({
    resource: 'routes',
    ids: dataGridProps?.rows?.map((item: any) => item?.routeId).filter(Boolean) ?? [],
    queryOptions: {
      enabled: !!dataGridProps?.rows,
    },
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'batchName',
        headerName: t('license_batches.fields.name'),
        type: 'string',
        minWidth: 150,
        flex: 1,
      },
      {
        field: 'routeId',
        headerName: t('license_batches.fields.route'),
        type: 'string',
        minWidth: 200,
        flex: 1,
        renderCell: function render({ value }) {
          if (routesIsLoading) {
            return t('loading');
          }
          const route = routesData?.data?.find((item) => item.id === value);
          return route ? route.title : value;
        },
      },
      {
        field: 'quantity',
        headerName: t('license_batches.fields.quantity'),
        type: 'number',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'price',
        headerName: t('license_batches.fields.price'),
        type: 'number',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'validDays',
        headerName: t('license_batches.fields.validDays'),
        type: 'number',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'createdAt',
        headerName: t('license_batches.fields.createdAt'),
        minWidth: 200,
        flex: 1,
        renderCell: function render({ value }) {
          return <DateField value={value} />;
        },
      },
    ],
    [routesData?.data, routesIsLoading, t],
  );

  return (
    <List>
      <DataGrid {...dataGridProps} columns={columns} autoHeight />
    </List>
  );
}
