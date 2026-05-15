import { ZainCashWebhookRequest } from '../../../packages/core/index.ts';
import { errorResponse, getLanguage } from '../_shared/error.ts';
import { logger } from '../_shared/logger.ts';

/**
 * ZainCash Webhook — Stub Implementation
 * ...
 */

// ─── HMAC Signature Verification ─────────────────────────────────────────────

/**
 * Verifies HMAC-SHA256 signature using constant-time comparison to prevent timing attacks.
 */
async function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= (expected.charCodeAt(i) ?? 0) ^ (signature.charCodeAt(i) ?? 0);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const lang = getLanguage(req);

  try {
    // ── 1. Extract HMAC signature ─────────────────────────────────────────────
    const signature = req.headers.get('X-ZainCash-Signature');

    if (!signature) {
      return errorResponse('invalid_input', 400, lang, { message: 'Missing signature' });
    }

    // ── 2. Check secret is configured ────────────────────────────────────────
    const zaincashSecret = Deno.env.get('ZAINCASH_SECRET');

    if (!zaincashSecret) {
      logger.warn('[ZainCash Webhook] ZAINCASH_SECRET not configured');
      return errorResponse('something_went_wrong', 503, lang, { message: 'Webhook not configured' });
    }

    // ── 3. Read body for HMAC verification ───────────────────────────────────
    const body = await req.text();

    // ── 4. Verify HMAC signature ──────────────────────────────────────────────
    const isValid = await verifyHmacSignature(body, signature, zaincashSecret);

    if (!isValid) {
      const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown';
      logger.warn('[ZainCash Webhook] Invalid HMAC signature', {
        ip: clientIp,
        signaturePrefix: signature.substring(0, 8),
      });
      return errorResponse('unauthorized', 401, lang, { message: 'Invalid signature' });
    }

    // ── 5. Parse body (already read as text) ─────────────────────────────────
    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return errorResponse('invalid_input', 400, lang, { message: 'Invalid JSON body' });
    }

    // Combine body and query for validation
    const combined = {
      ...Object.fromEntries(new URL(req.url).searchParams),
      ...parsedBody,
    };

    const parsed = ZainCashWebhookRequest.safeParse(combined);
    if (!parsed.success) {
      logger.warn('Invalid input', { details: parsed.error.flatten() });
      return errorResponse('invalid_input', 400, lang, parsed.error.flatten());
    }
    const { token } = parsed.data;

    // ── 6. Process payment (existing stub logic) ──────────────────────────────
    logger.warn('[ZainCash Webhook] Real implementation pending merchant credentials', { token: token.substring(0, 20) });
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    logger.error('[ZainCash Webhook] Unhandled error', { error: String(err) });
    return errorResponse('something_went_wrong', 500, lang);
  }
});
