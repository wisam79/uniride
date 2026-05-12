import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * ZainCash Checkout — Stub Implementation
 *
 * Full activation requires:
 *   - ZAINCASH_MSISDN   (merchant phone number)
 *   - ZAINCASH_SECRET   (JWT signing secret from ZainCash dashboard)
 *   - ZAINCASH_MERCHANT_ID
 *
 * Flow when credentials are available:
 *   1. Sign a JWT with { amount, serviceType, msisdn, orderId, redirectUrl, iat }
 *   2. POST to https://api.zaincash.iq/transaction/init → get { token, id }
 *   3. Return redirect URL: https://api.zaincash.iq/transaction/pay?id=<id>
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    // Only students can initiate checkout
    const role = user.app_metadata?.role;
    if (role !== 'student') return json({ error: 'Only students can initiate checkout' }, 403);

    // ── Validate body ─────────────────────────────────────────────────────────
    const { routeId, amount } = await req.json();
    if (!routeId || !amount) return json({ error: 'Missing routeId or amount' }, 400);
    if (typeof amount !== 'number' || amount <= 0) return json({ error: 'Invalid amount' }, 400);

    // ── Check if ZainCash credentials are configured ──────────────────────────
    const zaincashSecret = Deno.env.get('ZAINCASH_SECRET');
    const zaincashMsisdn = Deno.env.get('ZAINCASH_MSISDN');
    const zaincashMerchantId = Deno.env.get('ZAINCASH_MERCHANT_ID');

    if (!zaincashSecret || !zaincashMsisdn || !zaincashMerchantId) {
      // Stub mode — return a test URL
      console.warn('[ZainCash] Running in stub mode — credentials not configured');
      return json({
        success: true,
        stub: true,
        paymentUrl: `https://test.zaincash.iq/transaction/pay?id=stub_${Date.now()}`,
        message:
          'ZainCash is in stub mode. Configure ZAINCASH_SECRET, ZAINCASH_MSISDN, ZAINCASH_MERCHANT_ID to enable real payments.',
      });
    }

    // ── Real implementation (when credentials are set) ────────────────────────
    // TODO: Implement when merchant credentials are provided
    // const orderId = crypto.randomUUID();
    // const payload = { amount, serviceType: "UniRide", msisdn: zaincashMsisdn, orderId, redirectUrl: "...", iat: Math.floor(Date.now() / 1000) };
    // const jwtToken = await signJwt(payload, zaincashSecret);
    // const initRes = await fetch("https://api.zaincash.iq/transaction/init", { method: "POST", body: JSON.stringify({ token: jwtToken, merchantId: zaincashMerchantId }) });
    // const { id } = await initRes.json();
    // return json({ success: true, paymentUrl: `https://api.zaincash.iq/transaction/pay?id=${id}` });

    return json({ error: 'ZainCash real implementation pending merchant credentials' }, 501);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
