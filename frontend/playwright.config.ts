import { defineConfig, devices } from '@playwright/test'

const API_PORT = 5055
const WEB_PORT = 5190

/**
 * E2E runs against an in-memory MongoDB seeded by backend/scripts/e2e-server.js.
 * Geocoding is stubbed per test via page.route; map tiles come from OpenFreeMap
 * (tests never depend on the WebGL map rendering).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    // Optional: run with an installed browser instead of the bundled Chromium,
    // e.g. PW_CHANNEL=msedge (useful where the bundled build cannot start).
    channel: process.env.PW_CHANNEL || undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'node scripts/e2e-server.js',
      cwd: '../backend',
      url: `http://127.0.0.1:${API_PORT}/health`,
      stdout: 'pipe',
      reuseExistingServer: false,
      timeout: 180_000,
      env: { ...(process.env as Record<string, string>), E2E_API_PORT: String(API_PORT), CLIENT_URL: `http://localhost:${WEB_PORT}` },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort --host localhost`,
      url: `http://localhost:${WEB_PORT}`,
      stdout: 'pipe',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...(process.env as Record<string, string>), VITE_API_URL: `http://localhost:${API_PORT}/api` },
    },
  ],
})
