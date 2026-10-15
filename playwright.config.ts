import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 45_000,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.platform === "win32" ? "msedge" : undefined } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", channel: process.platform === "win32" ? "msedge" : undefined } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100",
    reuseExistingServer: false, timeout: 120_000,
    // Isolate local-mode tests from the user's Supabase database and paid AI account.
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", READINGS_ENCRYPTION_KEY: "",
      DEEPSEEK_API_KEY: "", AI_ALLOWED_EMAILS: "", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
