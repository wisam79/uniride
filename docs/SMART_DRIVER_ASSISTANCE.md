# Smart Driver Assistance And Lightweight GPS

## Goal

The driver app must be simple during real-world driving. The system should reduce manual taps by using route stops, lightweight GPS, geofencing, timing, and suggestions.

The driver confirms sensitive events. The system assists with context.

## Principles

- GPS is active only during active trips.
- GPS does not decide payment or final attendance.
- The system can suggest; the driver confirms.
- Student-facing tracking is approximate and time-stamped.
- Battery and data usage must be low.
- The driver must be able to override mistakes quickly.

## Driver Experience

The trip screen should focus on one primary card:

- Current or next student.
- Pickup label.
- Approximate distance.
- Suggested state.
- Primary buttons:
  - `Picked up`
  - `Absent`
  - `Skip`
- Secondary buttons:
  - `Call`
  - `Message`
  - `End trip`

The driver should not manage a long list of buttons for every student unless opening a manifest view.

## Lightweight GPS Policy

During an active trip:

- Send location every 30 to 60 seconds.
- Send sooner only if the driver moved meaningfully.
- Stop sending when trip ends.
- Store latest location for live display.
- Optionally store low-frequency history later.

Suggested thresholds:

- `nearby_radius_meters`: 300
- `arrival_radius_meters`: 80
- `left_stop_radius_meters`: 150
- `destination_radius_meters`: 200
- `minimum_location_interval_seconds`: 30

These thresholds should be admin-configurable eventually.

## Recommended Schema

```sql
CREATE TABLE route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE cascade,
  student_id uuid NOT NULL REFERENCES profiles(id),
  pickup_lat numeric,
  pickup_lng numeric,
  pickup_label text,
  stop_order integer NOT NULL,
  planned_pickup_time time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE trip_tracking_state (
  trip_id uuid PRIMARY KEY REFERENCES trips(id) ON DELETE cascade,
  current_stop_id uuid REFERENCES route_stops(id),
  next_stop_id uuid REFERENCES route_stops(id),
  last_lat numeric,
  last_lng numeric,
  last_accuracy_meters numeric,
  last_heading numeric,
  last_speed numeric,
  last_location_at timestamptz,
  auto_suggestion text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE trip_stop_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE cascade,
  route_stop_id uuid REFERENCES route_stops(id),
  student_id uuid NOT NULL REFERENCES profiles(id),
  event_type text NOT NULL,
  suggested_by_system boolean NOT NULL DEFAULT false,
  confirmed_by_driver boolean NOT NULL DEFAULT false,
  latitude numeric,
  longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Smart Suggestions

The system may suggest:

- Next student based on `stop_order`.
- `driver_nearby` when distance is within nearby radius.
- `driver_waiting` when inside arrival radius for a configured duration.
- Potential absence after waiting too long.
- Move to next stop after leaving current stop.
- End trip when close to destination.

The system must not automatically mark:

- `picked_up`
- `absent`
- `dropped_off`
- `completed`

## Required Tests

- Location updates are ignored for inactive trips.
- Driver can update only own active trip.
- Student sees only trip tracking for their active trip.
- Nearby suggestion triggers at configured radius.
- Picked-up requires driver confirmation.
- GPS stops after trip completion.
- Low-frequency updates do not flood database.

