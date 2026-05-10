import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED_ORIGINS = [
  Deno.env.get('ADMIN_URL') || 'http://localhost:3000',
  'exp://localhost:8081',
  'http://localhost:8081',
].join(',');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

Deno.serve(async (req: Request) => {
  try {
    const origin = req.headers.get('Origin') || '';
    const allowedOrigins = ALLOWED_ORIGINS.split(',');
    const resolvedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    const responseHeaders = {
      ...CORS_HEADERS,
      'Access-Control-Allow-Origin': resolvedOrigin,
      'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: responseHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: responseHeaders,
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: responseHeaders,
      });
    }

    if (!checkRateLimit(user.id, 30, 60000)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: responseHeaders,
      });
    }

    const { tripId, newStatus, lat, lng } = await req.json();

    if (!tripId || !newStatus) {
      return new Response(JSON.stringify({ error: 'Missing tripId or newStatus' }), {
        status: 400,
        headers: responseHeaders,
      });
    }

    const validStatuses = ['scheduled', 'driver_waiting', 'in_transit', 'completed', 'absent', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), {
        status: 400,
        headers: responseHeaders,
      });
    }

    const { data: driverData, error: driverError } = await supabaseClient
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driverData) {
      return new Response(JSON.stringify({ error: 'Driver profile not found' }), {
        status: 403,
        headers: responseHeaders,
      });
    }

    const { error } = await supabaseClient.rpc('update_trip_status', {
      p_trip_id: tripId,
      p_new_status: newStatus,
      p_lat: lat ?? null,
      p_lng: lng ?? null,
      p_driver_id: driverData.id,
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: responseHeaders,
      });
    }

    await supabaseClient.rpc('log_audit', {
      p_user_id: user.id,
      p_action: 'trip_status_change',
      p_resource: 'trips',
      p_resource_id: tripId,
      p_details: { newStatus, lat, lng },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: responseHeaders,
    });
  } catch (err) {
    const origin = req.headers.get('Origin') || '';
    const allowedOrigins = ALLOWED_ORIGINS.split(',');
    const resolvedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Access-Control-Allow-Origin': resolvedOrigin, 'Content-Type': 'application/json' },
    });
  }
});
