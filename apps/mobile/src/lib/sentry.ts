/**
 * Sentry integration for UniRide mobile app.
 * - Initializes only when EXPO_PUBLIC_SENTRY_DSN is set
 * - No-op when DSN is absent (app starts normally)
 */

let SentryModule: typeof import('@sentry/react-native') | null = null;

export function initSentry(): void {
  try {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (!dsn) return; // No DSN — silent no-op

    // Lazy import to avoid errors when package is not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SentryModule = require('@sentry/react-native');
    if (!SentryModule) return;

    SentryModule.init({
      dsn,
      environment: typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production',
      debug: typeof __DEV__ !== 'undefined' && __DEV__,
      tracesSampleRate: typeof __DEV__ !== 'undefined' && __DEV__ ? 0 : 0.2,
    });
  } catch {
    // Silent — never throw during init
  }
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  try {
    if (!SentryModule) return;
    SentryModule.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Silent
  }
}
