import { defineConfig, devices } from "@playwright/test";

const url = "http://localhost:3200";
if (!process.env.QEYDAI_DATABASE_URL) throw new Error("PostgreSQL E2E requires QEYDAI_DATABASE_URL");
export default defineConfig({
  testDir: "tests/e2e-pg",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: url, screenshot: "only-on-failure", trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start -- -p 3200",
    url: url + "/az/login",
    timeout: 90_000,
    reuseExistingServer: false,
    env: {
      QEYDAI_DATABASE_URL: process.env.QEYDAI_DATABASE_URL,
      QEYDAI_PANEL_SECRET: "ci-e2e-account-secret-0123456789abcdef",
      QEYDAI_ADMIN_KEYS: "{}",
      QEYDAI_API_KEYS: "{}",
      NODE_ENV: "production",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
