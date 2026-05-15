'use client';

import {
  List,
  useDataGrid,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from '@refinedev/mui';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';
import { Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function InstitutionList() {
  const { t } = useTranslation();
  const { dataGridProps } = useDataGrid({
    resource: 'institutions',
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'id',
        headerName: t('institutions.fields.id'),
        type: 'string',
        minWidth: 100,
        flex: 1,
      },
      {
        field: 'name',
        headerName: t('institutions.fields.name'),
        type: 'string',
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'city',
        headerName: t('institutions.fields.city'),
        type: 'string',
        minWidth: 150,
        flex: 1,
        renderCell: function render({ value }) {
          return value ?? '-';
        },
      },
      {
        field: 'createdAt',
        headerName: t('institutions.fields.createdAt'),
        minWidth: 160,
        flex: 1,
        renderCell: function render({ value }) {
          return value ? new Date(value).toLocaleDateString() : '-';
        },
      },
      {
        field: 'actions',
        headerName: t('institutions.fields.actions'),
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
              <DeleteButton hideText recordItemId={row.id} />
            </Stack>
          );
        },
        align: 'center',
        headerAlign: 'center',
        minWidth: 150,
      },
    ],
    [],
  );

  return (
    <List headerButtons={<CreateButton />}>
      <DataGrid {...dataGridProps} columns={columns} autoHeight />
    </List>
  );
}
