import type { NextConfig } from 'next';
import path from 'node:path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

let supabaseDomain = 'supabase.co';
if (SUPABASE_URL) {
  try {
    supabaseDomain = new URL(SUPABASE_URL).hostname;
  } catch {
    supabaseDomain = 'supabase.co';
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd(), '..', '..'),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `connect-src 'self' https://${supabaseDomain} wss://${supabaseDomain}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
