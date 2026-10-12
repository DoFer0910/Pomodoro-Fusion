import { defineConfig } from "@playwright/test"

const plan = process.env.YIELD_E2E_PLAN
if (plan !== "pro" && plan !== "free") throw new Error("YIELD_E2E_PLAN must be pro or free")

// 実際の開発起動を順番に確認する。本番の out/ を使う通常E2Eとは別にし、
// ライセンスのモックで開発・無料版の切替を済ませない。
export default defineConfig({
  testDir: "./e2e",
  testMatch: "license.spec.ts",
  outputDir: `test-results/license-${plan}`,
  projects: [{ name: `development-${plan}` }],
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3108", viewport: { width: 960, height: 900 }, trace: "retain-on-failure" },
  webServer: {
    command: `npm run ${plan === "pro" ? "dev" : "dev:free"} -- --port 3108`,
    url: "http://127.0.0.1:3108",
    reuseExistingServer: false,
    timeout: 120000,
  },
})
