'use client';

import { Create, useAutocomplete } from '@refinedev/mui';
import { Box, TextField, Checkbox, FormControlLabel, Autocomplete } from '@mui/material';
import { useForm } from '@refinedev/react-hook-form';
import { Controller } from 'react-hook-form';

import { BaseRecord, HttpError } from '@refinedev/core';

interface DriverFormValues {
  user_id: string;
  license_number: string;
  vehicle_model: string;
  vehicle_plate: string;
  capacity: number;
  is_verified: boolean;
}

export default function DriverCreate() {
  const {
    saveButtonProps,
    refineCore: { formLoading },
    register,
    control,
    formState: { errors },
  } = useForm<BaseRecord, HttpError, DriverFormValues>();

  const { autocompleteProps: profileAutocompleteProps } = useAutocomplete({
    resource: 'profiles',
  });

  return (
    <Create isLoading={formLoading} saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column' }} autoComplete="off">
        <Controller
          control={control}
          name="user_id"
          rules={{ required: 'This field is required' }}
          render={({ field }) => (
            <Autocomplete
              {...profileAutocompleteProps}
              {...field}
              onChange={(_, value) => {
                field.onChange(value?.id ?? value);
              }}
              getOptionLabel={(item) => {
                return (
                  profileAutocompleteProps?.options?.find(
                    (p) => p?.id?.toString() === (item?.id ?? item)?.toString(),
                  )?.full_name ?? ''
                );
              }}
              isOptionEqualToValue={(option, value) =>
                value === undefined || option?.id?.toString() === (value?.id ?? value)?.toString()
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="User Profile"
                  margin="normal"
                  variant="outlined"
                  error={!!errors?.user_id}
                  helperText={
                    errors?.user_id?.message ||
                    'Select a user profile (preferably with driver role)'
                  }
                  required
                  size={params.size ?? 'medium'}
                />
              )}
            />
          )}
        />
        <TextField
          {...register('license_number', {
            required: 'This field is required',
          })}
          error={!!errors?.license_number}
          helperText={errors?.license_number?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="License Number"
          name="license_number"
        />
        <TextField
          {...register('vehicle_model', {
            required: 'This field is required',
          })}
          error={!!errors?.vehicle_model}
          helperText={errors?.vehicle_model?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Vehicle Model"
          name="vehicle_model"
        />
        <TextField
          {...register('vehicle_plate', {
            required: 'This field is required',
          })}
          error={!!errors?.vehicle_plate}
          helperText={errors?.vehicle_plate?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Vehicle Plate"
          name="vehicle_plate"
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
        <FormControlLabel
          control={<Checkbox {...register('is_verified')} name="is_verified" />}
          label="Is Verified"
        />
      </Box>
    </Create>
  );
}
