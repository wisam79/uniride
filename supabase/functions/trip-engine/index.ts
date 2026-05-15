import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TripUpdateRequest } from '../../../packages/core/index.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse, getLanguage } from '../_shared/error.ts';
import { logger } from '../_shared/logger.ts';
import { initOtel, startSpan } from '../_shared/otel.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const tracer = initOtel('trip-engine');

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const lang = getLanguage(req);

  return startSpan(tracer, 'trip-engine.handle', async (span) => {
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.url', req.url);

    try {
      if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
      }

      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return errorResponse('unauthorized', 401, lang, undefined, corsHeaders);
      }

      const idempotencyKey = req.headers.get('idempotency-key');

      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      const token = authHeader.replace('Bearer ', '');
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(token);

      if (authError || !user) {
        return errorResponse('invalid_token', 401, lang, undefined, corsHeaders);
      }

      span.setAttribute('user.id', user.id);

      const { data: rateLimitOk, error: rateLimitError } = await supabaseClient.rpc(
        'check_rate_limit',
        {
          p_user_id: user.id,
          p_action: 'trip_engine',
          p_limit: 30,
          p_window_seconds: 60,
        },
      );

      if (rateLimitError || !rateLimitOk) {
        return errorResponse('too_many_requests', 429, lang, undefined, corsHeaders);
      }

      const parsed = TripUpdateRequest.safeParse(await req.json());
      if (!parsed.success) {
        logger.warn('Invalid input', { details: parsed.error.flatten(), userId: user.id });
        return errorResponse('invalid_input', 400, lang, parsed.error.flatten(), corsHeaders);
      }
      const { tripId, newStatus, lat, lng } = parsed.data;

      span.setAttribute('trip.id', tripId);
      span.setAttribute('trip.new_status', newStatus);

      const { data: driverData, error: driverError } = await supabaseClient
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (driverError || !driverData) {
        return errorResponse('driver_not_found', 403, lang, undefined, corsHeaders);
      }

      const { error } = await supabaseClient.rpc('update_trip_status', {
        p_trip_id: tripId,
        p_new_status: newStatus,
        p_lat: lat ?? null,
        p_lng: lng ?? null,
        p_driver_id: driverData.id,
        p_idempotency_key: idempotencyKey ?? null,
      });

      if (error) {
        if (error.message.includes('IDEMPOTENT_REQUEST')) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Status already updated (idempotent response)',
              idempotent: true,
            }),
            {
              headers: corsHeaders,
            },
          );
        }

        logger.error('Failed to update trip status', { error: error.message, tripId, newStatus });
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: corsHeaders,
      });
    } catch (err) {
      logger.error('Internal server error', { error: String(err) });
      return errorResponse('something_went_wrong', 500, lang, undefined, corsHeaders);
    }
  });
});
