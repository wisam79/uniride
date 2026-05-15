'use client';

import { Show, TextFieldComponent as TextField } from '@refinedev/mui';
import { Typography, Stack, Chip } from '@mui/material';
import { useShow, useOne } from '@refinedev/core';

const ROLE_COLORS: Record<
  string,
  'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'
> = {
  admin: 'error',
  student: 'primary',
  driver: 'success',
};

export default function ProfileShow() {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;
  const record = data?.data;

  // ✅ جلب اسم المؤسسة بدلاً من عرض UUID
  const { data: institutionData, isLoading: institutionLoading } = useOne({
    resource: 'institutions',
    id: record?.institutionId || record?.institution_id || '',
    queryOptions: {
      enabled: !!(record?.institutionId || record?.institution_id),
    },
  });

  return (
    <Show isLoading={isLoading}>
      <Stack gap={1}>
        <Typography variant="body1" fontWeight="bold">
          ID
        </Typography>
        <TextField value={record?.id} />

        <Typography variant="body1" fontWeight="bold">
          Full Name
        </Typography>
        <TextField value={record?.fullName ?? record?.full_name} />

        <Typography variant="body1" fontWeight="bold">
          Phone
        </Typography>
        <TextField value={record?.phone} />

        <Typography variant="body1" fontWeight="bold">
          Role
        </Typography>
        <Chip label={record?.role} color={ROLE_COLORS[record?.role] || 'default'} size="small" />

        <Typography variant="body1" fontWeight="bold">
          Verified
        </Typography>
        <Chip
          label={(record?.isVerified ?? record?.is_verified) ? 'Verified' : 'Not Verified'}
          color={(record?.isVerified ?? record?.is_verified) ? 'success' : 'default'}
          size="small"
        />

        <Typography variant="body1" fontWeight="bold">
          Institution
        </Typography>
        <TextField
          value={institutionLoading ? 'Loading...' : (institutionData?.data?.name ?? 'N/A')}
        />

        <Typography variant="body1" fontWeight="bold">
          Joined
        </Typography>
        <TextField
          value={
            (record?.createdAt ?? record?.created_at)
              ? new Date(record?.createdAt ?? record?.created_at).toLocaleString()
              : '-'
          }
        />
      </Stack>
    </Show>
  );
}
