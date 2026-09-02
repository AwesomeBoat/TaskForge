import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Load .env here so the test database URL is in place before any worker starts.
try {
  process.loadEnvFile('.env');
} catch {
  // CI may provide the variables directly.
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // The suites share one database; running files in sequence keeps them honest.
    fileParallelism: false,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
      NODE_ENV: 'test',
    },
  },
});
