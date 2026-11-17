import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

export const LEADS_FILE = path.join(os.tmpdir(), "qeydai-e2e-leads.jsonl");

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100/az",
    reuseExistingServer: false,
    env: { LEADS_FILE },
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
