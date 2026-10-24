import { createRequire } from 'node:module';
const require = createRequire(new URL('./frontend/package.json', import.meta.url));
const { defineConfig } = require('@playwright/test');

export default defineConfig({
  testDir: './scripts',
  testMatch: '**/smoke_live.spec.mjs',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  outputDir: './frontend/test-results',
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://127.0.0.1:5174',
    browserName: 'chromium',
    headless: true,
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
    trace: 'retain-on-failure'
  }
});
