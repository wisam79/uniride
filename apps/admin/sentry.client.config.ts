// @ts-ignore — @sentry/nextjs types require peer deps not installed in this project
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    debug: process.env.NODE_ENV === 'development',
  });
}
