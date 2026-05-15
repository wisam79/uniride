'use client';

import { Create, useAutocomplete } from '@refinedev/mui';
import { Box, TextField, Autocomplete } from '@mui/material';
import { useForm } from '@refinedev/react-hook-form';
import { Controller } from 'react-hook-form';
import { BaseRecord, HttpError } from '@refinedev/core';

interface FormValues {
  route_id: string;
  driver_id: string;
  scheduled_at: string;
}

export default function TripCreate() {
  const {
    saveButtonProps,
    refineCore: { formLoading },
    register,
    control,
    formState: { errors },
  } = useForm<BaseRecord, HttpError, FormValues>();

  const { autocompleteProps: routeAutocompleteProps } = useAutocomplete({
    resource: 'routes',
  });

  const { autocompleteProps: driverAutocompleteProps } = useAutocomplete({
    resource: 'drivers',
  });

  return (
    <Create isLoading={formLoading} saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column' }} autoComplete="off">
        <Controller
          control={control}
          name="route_id"
          rules={{ required: 'This field is required' }}
          render={({ field }) => (
            <Autocomplete
              {...routeAutocompleteProps}
              {...field}
              onChange={(_, value) => {
                field.onChange(value?.id ?? value);
              }}
              getOptionLabel={(item) => {
                return (
                  routeAutocompleteProps?.options?.find(
                    (p) => p?.id?.toString() === (item?.id ?? item)?.toString(),
                  )?.title ?? ''
                );
              }}
              isOptionEqualToValue={(option, value) =>
                value === undefined || option?.id?.toString() === (value?.id ?? value)?.toString()
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Route"
                  margin="normal"
                  variant="outlined"
                  error={!!errors?.route_id}
                  helperText={errors?.route_id?.message ?? undefined}
                  required
                  size={params.size ?? 'medium'}
                />
              )}
            />
          )}
        />

        <Controller
          control={control}
          name="driver_id"
          rules={{ required: 'This field is required' }}
          render={({ field }) => (
            <Autocomplete
              {...driverAutocompleteProps}
              {...field}
              onChange={(_, value) => {
                field.onChange(value?.id ?? value);
              }}
              getOptionLabel={(item) => {
                return (
                  driverAutocompleteProps?.options?.find(
                    (p) => p?.id?.toString() === (item?.id ?? item)?.toString(),
                  )?.vehicle_plate ?? ''
                );
              }}
              isOptionEqualToValue={(option, value) =>
                value === undefined || option?.id?.toString() === (value?.id ?? value)?.toString()
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Driver (Vehicle Plate)"
                  margin="normal"
                  variant="outlined"
                  error={!!errors?.driver_id}
                  helperText={errors?.driver_id?.message || 'Select the driver for this trip'}
                  required
                  size={params.size ?? 'medium'}
                />
              )}
            />
          )}
        />

        <TextField
          {...register('scheduled_at', {
            required: 'This field is required',
          })}
          error={!!errors?.scheduled_at}
          helperText={errors?.scheduled_at?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="datetime-local"
          label="Scheduled At"
          name="scheduled_at"
        />
      </Box>
    </Create>
  );
}
