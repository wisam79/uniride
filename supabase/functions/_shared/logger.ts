/**
 * Structured logger for Supabase Edge Functions (Deno).
 *
 * Outputs JSON lines to stderr/stdout for cloud log ingestion.
 * Replaces raw console.log/error calls per AGENTS.md §14.
 */

function log(level: 'info' | 'warn' | 'error', message: string, ctx?: Record<string, unknown>) {
  const entry = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
  });
  if (level === 'error') {
    console.error(entry);
  } else {
    // Use stderr for warn so it doesn't mix with response body
    console.warn(entry);
  }
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
};
