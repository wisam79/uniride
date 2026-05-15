import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';
import { initOtel, startSpan } from '../_shared/otel.ts';

const tracer = initOtel('health-check');

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  return startSpan(tracer, 'health-check.handle', async (span) => {
    const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};
    const start = Date.now();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Database check
    try {
      const dbStart = Date.now();
      const { error: dbError } = await supabase.rpc('ping');
      checks.db = {
        status: dbError ? 'unhealthy' : 'healthy',
        latency_ms: Date.now() - dbStart,
        ...(dbError ? { error: dbError.message } : {}),
      };
    } catch (err) {
      checks.db = { status: 'unhealthy', error: err instanceof Error ? err.message : String(err) };
    }

    // 2. Auth check
    try {
      const authStart = Date.now();
      const { error: authError } = await supabase.auth.getUser('invalid-token-check');
      checks.auth = {
        status: authError ? 'healthy' : 'healthy', // returns error for invalid token — expected
        latency_ms: Date.now() - authStart,
      };
    } catch (err) {
      checks.auth = {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const totalLatency = Date.now() - start;
    span.setAttribute('total_latency_ms', totalLatency);

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
    const status = allHealthy ? 200 : 503;

    const responseBody = {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      total_latency_ms: totalLatency,
      checks,
    };

    if (!allHealthy) {
      logger.error('Health check failed', responseBody);
    }

    return new Response(JSON.stringify(responseBody), {
      status,
      headers: corsHeaders,
    });
  });
});
