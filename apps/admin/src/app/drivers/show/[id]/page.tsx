'use client';

import { useShow, useOne } from '@refinedev/core';
import { Show, TextFieldComponent, NumberField, BooleanField } from '@refinedev/mui';
import { Typography, Stack } from '@mui/material';

export default function DriverShow() {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;
  const record = data?.data;

  const { data: profileData, isLoading: profileIsLoading } = useOne({
    resource: 'profiles',
    id: record?.userId || '',
    queryOptions: {
      enabled: !!record?.userId,
    },
  });

  return (
    <Show isLoading={isLoading}>
      <Stack gap={1}>
        <Typography variant="body1" fontWeight="bold">
          ID
        </Typography>
        <TextFieldComponent value={record?.id} />

        <Typography variant="body1" fontWeight="bold">
          User Profile
        </Typography>
        {profileIsLoading ? (
          <Typography variant="body2">Loading...</Typography>
        ) : (
          <TextFieldComponent value={profileData?.data?.fullName || record?.userId} />
        )}

        <Typography variant="body1" fontWeight="bold">
          License Number
        </Typography>
        <TextFieldComponent value={record?.licenseNumber} />

        <Typography variant="body1" fontWeight="bold">
          Vehicle Model
        </Typography>
        <TextFieldComponent value={record?.vehicleModel} />

        <Typography variant="body1" fontWeight="bold">
          Vehicle Plate
        </Typography>
        <TextFieldComponent value={record?.vehiclePlate} />

        <Typography variant="body1" fontWeight="bold">
          Capacity
        </Typography>
        <NumberField value={record?.capacity ?? ''} />

        <Typography variant="body1" fontWeight="bold">
          Verified
        </Typography>
        <BooleanField value={record?.isVerified} />
      </Stack>
    </Show>
  );
}
