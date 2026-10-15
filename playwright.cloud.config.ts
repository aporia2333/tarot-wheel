import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e-cloud", workers: 1, timeout: 60_000,
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3101", trace: "retain-on-failure",
    channel: process.platform === "win32" ? "msedge" : undefined },
  webServer: { command: "node tests/support/cloud-server.mjs", url: "http://127.0.0.1:3101", reuseExistingServer: false, timeout: 120_000 },
});
