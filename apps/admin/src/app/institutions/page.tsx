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

export default function InstitutionList() {
  const { dataGridProps } = useDataGrid({
    resource: 'institutions',
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
        field: 'name',
        headerName: 'Name',
        type: 'string',
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'city',
        headerName: 'City',
        type: 'string',
        minWidth: 150,
        flex: 1,
        renderCell: function render({ value }) {
          return value ?? '-';
        },
      },
      {
        field: 'created_at',
        headerName: 'Created',
        minWidth: 160,
        flex: 1,
        renderCell: function render({ value }) {
          return value ? new Date(value).toLocaleDateString() : '-';
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
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
