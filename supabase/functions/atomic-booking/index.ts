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

    if (!checkRateLimit(user.id, 10, 60000)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: responseHeaders,
      });
    }

    const body = await req.json();
    const { routeId, studentId } = body;

    if (!routeId || !studentId) {
      return new Response(JSON.stringify({ error: 'Missing routeId or studentId' }), {
        status: 400,
        headers: responseHeaders,
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(routeId) || !uuidRegex.test(studentId)) {
      return new Response(JSON.stringify({ error: 'Invalid routeId or studentId format' }), {
        status: 400,
        headers: responseHeaders,
      });
    }

    if (studentId !== user.id) {
      return new Response(JSON.stringify({ error: 'Student ID mismatch' }), {
        status: 403,
        headers: responseHeaders,
      });
    }

    const { data, error } = await supabaseClient.rpc('reserve_seat', {
      p_route_id: routeId,
      p_student_id: studentId,
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: responseHeaders,
      });
    }

    await supabaseClient.rpc('log_audit', {
      p_user_id: user.id,
      p_action: 'book_seat',
      p_resource: 'subscriptions',
      p_resource_id: data,
      p_details: { routeId, studentId },
    });

    return new Response(JSON.stringify({ success: true, subscriptionId: data, message: 'Seat reserved successfully' }), {
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
