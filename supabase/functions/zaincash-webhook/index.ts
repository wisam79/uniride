import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * ZainCash Webhook — Stub Implementation
 *
 * ZainCash calls this endpoint after payment with a signed JWT in the query string.
 * Full activation requires ZAINCASH_SECRET to verify the JWT signature.
 *
 * Expected query param: ?token=<jwt>
 * JWT payload: { id, key, type, status, amount, orderId, date, merchantId, msisdn }
 */

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const zaincashSecret = Deno.env.get('ZAINCASH_SECRET');

    if (!zaincashSecret) {
      // Stub mode — log and acknowledge
      console.warn(
        '[ZainCash Webhook] Stub mode — ZAINCASH_SECRET not configured. Token received:',
        token.substring(0, 20) + '...',
      );
      return new Response(JSON.stringify({ received: true, stub: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Real implementation (when credentials are set) ────────────────────────
    // TODO: Implement when merchant credentials are provided
    //
    // 1. Verify JWT signature using zaincashSecret
    //    const payload = await verifyJwt(token, zaincashSecret);
    //
    // 2. Check payment status
    //    if (payload.status !== "success") return acknowledge without action
    //
    // 3. Extract orderId → look up pending subscription in DB
    //    const { data: order } = await supabaseAdmin.from("payment_orders").select("*").eq("id", payload.orderId).single();
    //
    // 4. Activate the license / subscription
    //    await supabaseAdmin.rpc("activate_license", { p_code: order.license_code });
    //
    // 5. Log the transaction for audit
    //    await supabaseAdmin.rpc("log_audit", { ... });

    console.warn('[ZainCash Webhook] Real implementation pending merchant credentials');
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.warn('[ZainCash Webhook] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
