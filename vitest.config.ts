import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.next/**', '**/apps/mobile/**'],
    resolve: {
      alias: {
        '@uniride/core': path.resolve(__dirname, 'packages/core'),
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/*.config.ts',
        '**/*.config.js',
        '**/*.d.ts',
        '**/e2e/**',
      ],
    },
  },
});
