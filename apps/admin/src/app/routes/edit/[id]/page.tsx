'use client';

import { Edit } from '@refinedev/mui';
import { Box, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { useForm } from '@refinedev/react-hook-form';
import { Controller } from 'react-hook-form';
import { BaseRecord, HttpError } from '@refinedev/core';

interface FormValues {
  title: string;
  startLocation: string;
  endLocation: string;
  price: number;
  capacity: number;
  availableSeats: number;
  isActive: boolean;
}

export default function RouteEdit() {
  const {
    saveButtonProps,
    refineCore: { queryResult, formLoading },
    register,
    control,
    watch,
    formState: { errors },
  } = useForm<BaseRecord, HttpError, FormValues>();

  const routesData = queryResult?.data?.data;
  const currentDriverId = routesData?.driverId;

  return (
    <Edit isLoading={formLoading} saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column' }} autoComplete="off">
        <TextField
          value={currentDriverId || ''}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          label="Driver ID"
          disabled
          helperText="Driver cannot be changed after creation"
        />
        <TextField
          {...register('title', {
            required: 'This field is required',
          })}
          error={!!errors?.title}
          helperText={errors?.title?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Title"
          name="title"
        />
        <TextField
          {...register('startLocation', {
            required: 'This field is required',
          })}
          error={!!errors?.startLocation}
          helperText={errors?.startLocation?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Start Location"
          name="startLocation"
        />
        <TextField
          {...register('endLocation', {
            required: 'This field is required',
          })}
          error={!!errors?.endLocation}
          helperText={errors?.endLocation?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="End Location"
          name="endLocation"
        />
        <TextField
          {...register('price', {
            required: 'This field is required',
            valueAsNumber: true,
            validate: (value) => value > 0 || 'Price must be greater than 0',
          })}
          error={!!errors?.price}
          helperText={errors?.price?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="number"
          label="Price (IQD)"
          name="price"
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
        <TextField
          {...register('availableSeats', {
            required: 'This field is required',
            valueAsNumber: true,
            validate: (value) => {
              const capacity = watch('capacity');
              return value <= capacity || 'Available seats cannot exceed capacity';
            },
          })}
          error={!!errors?.availableSeats}
          helperText={errors?.availableSeats?.message || 'Must be less than or equal to capacity'}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="number"
          label="Available Seats"
          name="availableSeats"
        />
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={field.value} />}
              label="Is Active"
            />
          )}
        />
      </Box>
    </Edit>
  );
}
