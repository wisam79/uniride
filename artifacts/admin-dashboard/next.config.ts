import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import { loadEnvConfig } from '@next/env';
import path from 'path';

const workspaceRoot = path.resolve(process.cwd(), '..', '..');
loadEnvConfig(workspaceRoot);

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
};

export default withSentryConfig(nextConfig, {
  org: 'uniride',
  project: 'admin-dashboard',
  silent: true,
});
