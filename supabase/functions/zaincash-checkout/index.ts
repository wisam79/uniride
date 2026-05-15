import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CheckoutRequest } from '../../../packages/core/index.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse, getLanguage } from '../_shared/error.ts';
import { logger } from '../_shared/logger.ts';

/**
 * ZainCash Checkout — Stub Implementation
 * ...
 */

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const lang = getLanguage(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('unauthorized', 401, lang, undefined, corsHeaders);
    const idempotencyKey = req.headers.get('idempotency-key');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse('invalid_token', 401, lang, undefined, corsHeaders);

    const role = user.app_metadata?.role;
    if (role !== 'student') return errorResponse('unauthorized', 403, lang, undefined, corsHeaders);

    const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc(
      'check_rate_limit',
      {
        p_user_id: user.id,
        p_action: 'zaincash_checkout',
        p_limit: 5,
        p_window_seconds: 60,
      },
    );

    if (rateLimitError || !rateLimitOk) {
      return errorResponse('too_many_requests', 429, lang, undefined, corsHeaders);
    }

    if (idempotencyKey) {
      const { data: existingAudit } = await supabaseAdmin
        .from('audit_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('action', 'zaincash_checkout')
        .eq('resource_id', 'checkout') // We use a generic ID if specific one not yet created
        .eq('details->>idempotencyKey', idempotencyKey)
        .single();

      if (existingAudit) {
        return new Response(
          JSON.stringify({
            success: true,
            idempotent: true,
            message: 'Checkout already processed',
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    const parsed = CheckoutRequest.safeParse(await req.json());
    if (!parsed.success) {
      logger.warn('Invalid input', { details: parsed.error.flatten(), userId: user.id });
      return errorResponse('invalid_input', 400, lang, parsed.error.flatten(), corsHeaders);
    }
    const { routeId } = parsed.data;

    const { data: routeData, error: routeError } = await supabaseAdmin
      .from('routes')
      .select('price')
      .eq('id', routeId)
      .single();

    if (routeError || !routeData) {
      return errorResponse('route_not_found', 404, lang, undefined, corsHeaders);
    }

    const amount = routeData.price;
    if (typeof amount !== 'number' || amount <= 0) {
      return errorResponse('invalid_input', 400, lang, { message: 'Invalid route price' }, corsHeaders);
    }

    // ── Check if ZainCash credentials are configured ──────────────────────────
    const zaincashSecret = Deno.env.get('ZAINCASH_SECRET');
    const zaincashMsisdn = Deno.env.get('ZAINCASH_MSISDN');
    const zaincashMerchantId = Deno.env.get('ZAINCASH_MERCHANT_ID');

    if (!zaincashSecret || !zaincashMsisdn || !zaincashMerchantId) {
      logger.warn('[ZainCash] Running in stub mode — credentials not configured', { userId: user.id, routeId });
      
      await supabaseAdmin.rpc('log_audit', {
        p_user_id: user.id,
        p_action: 'zaincash_checkout',
        p_resource: 'routes',
        p_resource_id: routeId,
        p_details: { idempotencyKey, amount, stub: true },
      });

      return new Response(
        JSON.stringify({
          success: true,
          stub: true,
          paymentUrl: `https://test.zaincash.iq/transaction/pay?id=stub_${Date.now()}`,
          message: 'ZainCash is in stub mode. Configure credentials for production.',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Real implementation TODO
    return errorResponse('something_went_wrong', 501, lang, { message: 'ZainCash real implementation pending' }, corsHeaders);
  } catch (err: unknown) {
    logger.error('Internal server error', { error: String(err) });
    return errorResponse('something_went_wrong', 500, lang, undefined, corsHeaders);
  }
});
