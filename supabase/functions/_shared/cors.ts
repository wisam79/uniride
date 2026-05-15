export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const ALLOWED_ORIGINS = [
  Deno.env.get('ADMIN_URL') || 'http://localhost:3000',
  'exp://localhost:8081',
  'http://localhost:8081',
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  const resolvedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': resolvedOrigin,
  };
}
