import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

export const E2E_BASE_URL = "http://localhost:3000";
export const LEADS_FILE = path.join(os.tmpdir(), "qeydai-e2e-leads.jsonl");
export const ANALYTICS_FILE = path.join(os.tmpdir(), "qeydai-e2e-analytics.jsonl");
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
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
