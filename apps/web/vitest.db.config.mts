import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.db.test.ts'],
    setupFiles: ['./test/env.ts'],
    globalSetup: ['./test/db-global-setup.ts'],
    // Tests share one database; run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
