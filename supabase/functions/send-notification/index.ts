import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NotificationRequest } from '../../../packages/core/index.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse, getLanguage } from '../_shared/error.ts';
import { logger } from '../_shared/logger.ts';
import { initOtel, startSpan } from '../_shared/otel.ts';

const tracer = initOtel('send-notification');

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res;
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

interface ExpoResult {
  status?: string;
  data?: {
    status?: string;
    details?: { error?: string };
  };
}

interface PushTokenRow {
  token: string;
  user_id: string;
}

async function cleanupInvalidTokens(
  supabaseAdmin: ReturnType<typeof createClient>,
  results: PromiseSettledResult<unknown>[],
  pushTokens: PushTokenRow[],
): Promise<void> {
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status !== 'fulfilled') continue;

    const expoResult = result.value as ExpoResult;
    const isDeviceNotRegistered =
      expoResult?.data?.status === 'error' &&
      expoResult?.data?.details?.error === 'DeviceNotRegistered';

    if (!isDeviceNotRegistered) continue;

    const tokenRow = pushTokens[i];
    if (!tokenRow) continue;

    const { token, user_id } = tokenRow;

    try {
      const { error } = await supabaseAdmin.from('push_tokens').delete().eq('token', token);

      if (error) {
        logger.error('[PushCleanup] Failed to delete invalid token', { reason: error.message, userId: user_id });
      } else {
        logger.warn('[PushCleanup] Deleted DeviceNotRegistered token', { user_id });
      }
    } catch (err) {
      logger.error('[PushCleanup] Exception deleting token', { error: String(err) });
    }
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const lang = getLanguage(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return startSpan(tracer, 'send-notification.handle', async (span) => {
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.url', req.url);

    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return errorResponse('unauthorized', 401, lang, undefined, corsHeaders);
      const idempotencyKey = req.headers.get('idempotency-key');

      const token = authHeader.replace('Bearer ', '');
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) return errorResponse('invalid_token', 401, lang, undefined, corsHeaders);

      const role = user.app_metadata?.role as string | undefined;
      if (!role || !['admin', 'driver'].includes(role)) {
        return errorResponse('unauthorized', 403, lang, { message: 'Only admins and drivers can send notifications' }, corsHeaders);
      }

      const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc(
        'check_rate_limit',
        {
          p_user_id: user.id,
          p_action: 'send_notification',
          p_limit: 10,
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
          .eq('action', 'send_notification')
          .eq('details->>idempotencyKey', idempotencyKey)
          .single();

        if (existingAudit) {
          return new Response(
            JSON.stringify({
              success: true,
              sent: 0,
              failed: 0,
              idempotent: true,
              message: 'Notification already processed',
            }),
            { status: 200, headers: corsHeaders }
          );
        }
      }

      const parsed = NotificationRequest.safeParse(await req.json());
      if (!parsed.success) {
        logger.warn('Invalid input', { details: parsed.error.flatten(), userId: user.id });
        return errorResponse('invalid_input', 400, lang, parsed.error.flatten(), corsHeaders);
      }
      const { targetUserId, targetRole, title, body, data } = parsed.data;

      if (role === 'driver') {
        if (!targetUserId) {
          return errorResponse('unauthorized', 403, lang, { message: 'Drivers can only message specific users' }, corsHeaders);
        }
        const { data: driverRow } = await supabaseAdmin
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!driverRow) {
          return errorResponse('driver_not_found', 403, lang, undefined, corsHeaders);
        }

        const { data: match } = await supabaseAdmin
          .from('subscriptions')
          .select('id, routes!inner(driver_id)')
          .eq('student_id', targetUserId)
          .eq('routes.driver_id', driverRow.id)
          .eq('status', 'active')
          .limit(1);

        if (!match || match.length === 0) {
          return errorResponse('unauthorized', 403, lang, { message: 'Cannot send notification to this user' }, corsHeaders);
        }
      }

      let query = supabaseAdmin.from('push_tokens').select('token, user_id');

      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      } else if (targetRole && targetRole !== 'all') {
        const { data: roleUsers, error: roleError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('role', targetRole);

        if (roleError) throw roleError;

        const userIds = roleUsers?.map((u) => u.id) || [];
        if (userIds.length > 0) {
          query = query.in('user_id', userIds);
        } else {
          return new Response(
            JSON.stringify({ success: true, sent: 0, failed: 0, results: [] }),
            { status: 200, headers: corsHeaders }
          );
        }
      }

      const { data: pushTokens, error: tokenError } = await query;

      if (tokenError) throw tokenError;

      if (!pushTokens || pushTokens.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'User has no push token' }),
          { status: 200, headers: corsHeaders }
        );
      }

      const results = await Promise.allSettled(
        pushTokens.map(async ({ token }: { token: string }) => {
          const expoResponse = await fetchWithRetry('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: token,
              sound: 'default',
              title,
              body,
              data: data || {},
            }),
          });
          return expoResponse.json();
        }),
      );

      try {
        await cleanupInvalidTokens(supabaseAdmin, results, pushTokens as PushTokenRow[]);
      } catch (err) {
        logger.error('[PushCleanup] Error during cleanup', { error: String(err) });
      }

      const succeeded = results.filter(
        (r: PromiseSettledResult<unknown>) => r.status === 'fulfilled',
      ).length;
      const failed = results.filter(
        (r: PromiseSettledResult<unknown>) => r.status === 'rejected',
      ).length;

      await supabaseAdmin.rpc('log_audit', {
        p_user_id: user.id,
        p_action: 'send_notification',
        p_resource: 'push_tokens',
        p_resource_id: null,
        p_details: {
          idempotencyKey,
          targetUserId: targetUserId ?? null,
          targetRole: targetRole ?? null,
          sent: succeeded,
          failed,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          sent: succeeded,
          failed,
          results: results.map((r: PromiseSettledResult<unknown>) =>
            r.status === 'fulfilled'
              ? (r as PromiseFulfilledResult<unknown>).value
              : { error: (r as PromiseRejectedResult).reason?.message },
          ),
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error: unknown) {
      logger.error('Internal server error', { error: String(error) });
      return errorResponse('something_went_wrong', 400, lang, undefined, corsHeaders);
    }
  });
});
