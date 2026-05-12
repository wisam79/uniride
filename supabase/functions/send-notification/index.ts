import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

// ─── Retry helper ─────────────────────────────────────────────────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res; // don't retry 4xx
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError ?? new Error('Max retries exceeded');
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── 1. Authenticate caller ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) return jsonResponse({ error: 'Invalid token' }, 401);

    // ── 2. Role check — only admin or driver may send notifications ───────────
    const role = user.app_metadata?.role as string | undefined;
    if (!role || !['admin', 'driver'].includes(role)) {
      return jsonResponse({ error: 'Only admins and drivers can send notifications' }, 403);
    }

    // ── 3. Parse & validate body ──────────────────────────────────────────────
    const { targetUserId, title, body, data } = await req.json();
    if (!targetUserId || !title || !body) {
      return jsonResponse({ error: 'Missing required fields: targetUserId, title, body' }, 400);
    }

    // ── 4. Driver scope check — can only notify students on their own routes ──
    if (role === 'driver') {
      const { data: driverRow } = await supabaseAdmin
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driverRow) {
        return jsonResponse({ error: 'Driver profile not found' }, 403);
      }

      // Verify targetUserId is a student subscribed to one of this driver's routes
      const { data: match } = await supabaseAdmin
        .from('subscriptions')
        .select('id, routes!inner(driver_id)')
        .eq('student_id', targetUserId)
        .eq('routes.driver_id', driverRow.id)
        .eq('status', 'active')
        .limit(1);

      if (!match || match.length === 0) {
        return jsonResponse({ error: 'Cannot send notification to this user' }, 403);
      }
    }

    // ── 5. Fetch push token ───────────────────────────────────────────────────
    const { data: pushTokens, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', targetUserId);

    if (tokenError) throw tokenError;

    if (!pushTokens || pushTokens.length === 0) {
      return jsonResponse({ success: false, message: 'User has no push token' }, 200);
    }

    const expoPushToken = pushTokens[0].token;

    // ── 6. Send via Expo Push API (with retry) ────────────────────────────────
    const expoResponse = await fetchWithRetry('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
      }),
    });

    const expoResult = await expoResponse.json();

    return jsonResponse({ success: true, expoResult });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ error: message }, 400);
  }
});
