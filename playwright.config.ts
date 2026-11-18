import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

export const LEADS_FILE = path.join(os.tmpdir(), "qeydai-e2e-leads.jsonl");
// One fresh database per run; workers inherit this env var from the main process.
process.env.E2E_DB ??= path.join(os.tmpdir(), `qeydai-e2e-${Date.now()}.sqlite`);
export const E2E_DB = process.env.E2E_DB;
export const E2E_KEYS = {
  desktop: "e2e-desktop-key-0123456789abcdef",
  mobile: "e2e-mobile-key-0123456789abcdef",
};

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100/az",
    reuseExistingServer: false,
    env: {
      LEADS_FILE,
      ENROLL_DB_FILE: E2E_DB,
      QEYDAI_API_KEYS: JSON.stringify({ [E2E_KEYS.desktop]: "e2e-desktop", [E2E_KEYS.mobile]: "e2e-mobile" }),
    },
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
