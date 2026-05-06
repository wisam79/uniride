import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Trip Scheduled',
  driver_waiting: 'Driver is Waiting',
  in_transit: 'Trip Started',
  completed: 'Trip Completed',
  cancelled: 'Trip Cancelled',
  absent: 'Marked Absent',
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { tripId, newStatus } = await req.json();
    if (!tripId || !newStatus) {
      return new Response(JSON.stringify({ error: 'tripId and newStatus required' }), { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const callerId = user.id;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller owns the trip
    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .select('driver_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), { status: 404 });
    }

    const { data: driver, error: driverError } = await supabaseAdmin
      .from('drivers')
      .select('user_id')
      .eq('id', trip.driver_id)
      .single();

    if (driverError || !driver) {
      return new Response(JSON.stringify({ error: 'Driver not found' }), { status: 404 });
    }

    if (driver.user_id !== callerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const { data: students, error: studentsError } = await supabaseAdmin
      .from('trip_students')
      .select('student_id')
      .eq('trip_id', tripId);

    if (studentsError) {
      return new Response(JSON.stringify({ error: studentsError.message }), { status: 500 });
    }

    const label = STATUS_LABELS[newStatus] || `Status updated to ${newStatus}`;

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Batch insert notifications atomically
    const notificationInserts = students.map((s: any) => ({
      user_id: s.student_id,
      type: 'trip_update' as const,
      title: label,
      body: `Your trip (${tripId}) status changed to ${label}`,
      data: JSON.stringify({ tripId, status: newStatus }),
      is_read: false,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationInserts);

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }

    const notifiedIds = students.map((s: any) => s.student_id);

    return new Response(JSON.stringify({ success: true, notified: notifiedIds }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});