import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

export const E2E_BASE_URL = "http://localhost:3100";
export const LEADS_FILE = path.join(os.tmpdir(), "qeydai-e2e-leads.jsonl");
export const ANALYTICS_FILE = path.join(os.tmpdir(), "qeydai-e2e-analytics.jsonl");
// One fresh database per run; workers inherit this env var from the main process.
// Only the server opens it: tests seed through the admin API, because a second process holding
// the SQLite write lock makes the server's synchronous busy wait stall every request.
process.env.E2E_DB ??= path.join(os.tmpdir(), `qeydai-e2e-${Date.now()}.sqlite`);
export const E2E_DB = process.env.E2E_DB;
export const E2E_KEYS = {
  desktop: "e2e-desktop-key-0123456789abcdef",
  mobile: "e2e-mobile-key-0123456789abcdef",
};
export const E2E_ADMIN_KEYS = {
  desktop: "e2e-desktop-admin-0123456789abcdef",
  mobile: "e2e-mobile-admin-0123456789abcdef",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100/az",
    reuseExistingServer: false,
    env: {
      LEADS_FILE,
      ANALYTICS_FILE,
      ENROLL_DB_FILE: E2E_DB,
      QEYDAI_FORCE_SQLITE: "1",
      QEYDAI_LEAD_RATE_MAX: "100000",
      QEYDAI_LEAD_RATE_GLOBAL_MAX: "100000",
      QEYDAI_API_KEYS: JSON.stringify({ [E2E_KEYS.desktop]: "e2e-desktop", [E2E_KEYS.mobile]: "e2e-mobile" }),
      QEYDAI_PANEL_SECRET: "e2e-panel-secret-0123456789abcdef0123",
      QEYDAI_ADMIN_KEYS: JSON.stringify({ [E2E_ADMIN_KEYS.desktop]: "e2e-desktop", [E2E_ADMIN_KEYS.mobile]: "e2e-mobile" }),
    },
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
