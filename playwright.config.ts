import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:3107", timezoneId: "Asia/Tokyo", viewport: { width: 960, height: 900 }, trace: "retain-on-failure" },
  webServer: { command: "node e2e/server.cjs", url: "http://127.0.0.1:3107", reuseExistingServer: false },
})
