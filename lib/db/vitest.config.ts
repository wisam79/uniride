import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    timeout: 30000, // 30 ثانية للاختبارات التي تتطلب قاعدة بيانات
    pool: 'threads',
    maxWorkers: 4,
    minWorkers: 1,
  },
});
