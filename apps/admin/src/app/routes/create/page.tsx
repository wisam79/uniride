"use client";

import { Create } from "@refinedev/mui";
import { Box, TextField, Checkbox, FormControlLabel } from "@mui/material";
import { useForm } from "@refinedev/react-hook-form";

export default function RouteCreate() {
  const {
    saveButtonProps,
    refineCore: { formLoading },
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const selectedDriverId = watch("driver_id");

  return (
    <Create isLoading={formLoading} saveButtonProps={saveButtonProps}>
      <Box
        component="form"
        sx={{ display: "flex", flexDirection: "column" }}
        autoComplete="off"
      >
        <TextField
          {...register("driver_id", {
            required: "This field is required",
          })}
          error={!!(errors as any)?.driver_id}
          helperText={(errors as any)?.driver_id?.message || "Enter driver UUID from Drivers list"}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Driver ID (UUID)"
          name="driver_id"
          placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
        />
        <TextField
          {...register("title", {
            required: "This field is required",
          })}
          error={!!(errors as any)?.title}
          helperText={(errors as any)?.title?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Title"
          name="title"
        />
        <TextField
          {...register("start_location", {
            required: "This field is required",
          })}
          error={!!(errors as any)?.start_location}
          helperText={(errors as any)?.start_location?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="Start Location"
          name="start_location"
        />
        <TextField
          {...register("end_location", {
            required: "This field is required",
          })}
          error={!!(errors as any)?.end_location}
          helperText={(errors as any)?.end_location?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label="End Location"
          name="end_location"
        />
        <TextField
          {...register("price", {
            required: "This field is required",
            valueAsNumber: true,
            validate: (value) => value > 0 || "Price must be greater than 0",
          })}
          error={!!(errors as any)?.price}
          helperText={(errors as any)?.price?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="number"
          label="Price (IQD)"
          name="price"
        />
        <TextField
          {...register("capacity", {
            required: "This field is required",
            valueAsNumber: true,
            validate: (value) => value >= 1 || "Capacity must be at least 1",
          })}
          error={!!(errors as any)?.capacity}
          helperText={(errors as any)?.capacity?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="number"
          label="Capacity"
          name="capacity"
        />
        <TextField
          {...register("available_seats", {
            required: "This field is required",
            valueAsNumber: true,
            validate: (value) => {
              const capacity = watch("capacity");
              return value <= capacity || "Available seats cannot exceed capacity";
            },
          })}
          error={!!(errors as any)?.available_seats}
          helperText={(errors as any)?.available_seats?.message || "Must be less than or equal to capacity"}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="number"
          label="Available Seats"
          name="available_seats"
        />
        <FormControlLabel
          control={
            <Checkbox
              {...register("is_active")}
              defaultChecked={true}
              name="is_active"
            />
          }
          label="Is Active"
        />
      </Box>
    </Create>
  );
}