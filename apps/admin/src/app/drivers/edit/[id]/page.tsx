'use client';

import { Edit } from '@refinedev/mui';
import { Box, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { useForm } from '@refinedev/react-hook-form';
import { Controller } from 'react-hook-form';

import { BaseRecord, HttpError } from '@refinedev/core';

interface DriverEditFormValues {
  licenseNumber: string;
  vehicleModel: string;
  vehiclePlate: string;
  capacity: number;
  isVerified: boolean;
}

export default function DriverEdit() {
  const {
    saveButtonProps,
    refineCore: { queryResult, formLoading },
    register,
    control,
    formState: { errors },
  } = useForm<BaseRecord, HttpError, DriverEditFormValues>();

  const driverData = queryResult?.data?.data;
  const currentUserId = driverData?.userId;

  return (
    <Edit isLoading={formLoading} saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column' }} autoComplete="off">
        <TextField
          value={currentUserId || ''}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          label="User Profile ID"
          disabled
          helperText="User profile cannot be changed after creation"
        />
        <TextField
          {...register('licenseNumber', {
            required: 'This field is required',
          })}
          error={!!errors?.licenseNumber}
          helperText={errors?.licenseNumber?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="License Number"
          name="licenseNumber"
        />
        <TextField
          {...register('vehicleModel', {
            required: 'This field is required',
          })}
          error={!!errors?.vehicleModel}
          helperText={errors?.vehicleModel?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Vehicle Model"
          name="vehicleModel"
        />
        <TextField
          {...register('vehiclePlate', {
            required: 'This field is required',
          })}
          error={!!errors?.vehiclePlate}
          helperText={errors?.vehiclePlate?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Vehicle Plate"
          name="vehiclePlate"
        />
        <TextField
          {...register('capacity', {
            required: 'This field is required',
            valueAsNumber: true,
            validate: (value) => value >= 1 || 'Capacity must be at least 1',
          })}
          error={!!errors?.capacity}
          helperText={errors?.capacity?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="number"
          label="Capacity"
          name="capacity"
        />
        <Controller
          control={control}
          name="isVerified"
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={field.value} />}
              label="Is Verified"
            />
          )}
        />
      </Box>
    </Edit>
  );
}
