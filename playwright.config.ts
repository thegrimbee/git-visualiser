import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './src/test/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  retries: 0,
  use: {
    trace: 'on-first-retry'
  }
})