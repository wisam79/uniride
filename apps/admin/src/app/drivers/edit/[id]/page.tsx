"use client";

import { Edit } from "@refinedev/mui";
import { Box, TextField, Checkbox, FormControlLabel } from "@mui/material";
import { useForm } from "@refinedev/react-hook-form";
import { Controller } from "react-hook-form";

import { BaseRecord, HttpError } from "@refinedev/core";

interface DriverEditFormValues {
  license_number: string;
  vehicle_model: string;
  vehicle_plate: string;
  capacity: number;
  is_verified: boolean;
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
  const currentUserId = driverData?.user_id;

  return (
    <Edit isLoading={formLoading} saveButtonProps={saveButtonProps}>
      <Box
        component="form"
        sx={{ display: "flex", flexDirection: "column" }}
        autoComplete="off"
      >
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
          {...register("license_number", {
            required: "This field is required",
          })}
          error={!!(errors)?.license_number}
          helperText={(errors)?.license_number?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="License Number"
          name="license_number"
        />
        <TextField
          {...register("vehicle_model", {
            required: "This field is required",
          })}
          error={!!(errors)?.vehicle_model}
          helperText={(errors)?.vehicle_model?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Vehicle Model"
          name="vehicle_model"
        />
        <TextField
          {...register("vehicle_plate", {
            required: "This field is required",
          })}
          error={!!(errors)?.vehicle_plate}
          helperText={(errors)?.vehicle_plate?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Vehicle Plate"
          name="vehicle_plate"
        />
        <TextField
          {...register("capacity", {
            required: "This field is required",
            valueAsNumber: true,
            validate: (value) => value >= 1 || "Capacity must be at least 1",
          })}
          error={!!(errors)?.capacity}
          helperText={(errors)?.capacity?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="number"
          label="Capacity"
          name="capacity"
        />
        <Controller
          control={control}
          name="is_verified"
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