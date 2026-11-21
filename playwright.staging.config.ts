import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL } from "./playwright.config";

const required = [
  "QEYDAI_DATABASE_URL",
  "STAGING_E2E_TENANT_A", "STAGING_E2E_TENANT_B",
  "STAGING_E2E_ADMIN_KEY_A", "STAGING_E2E_ADMIN_KEY_B",
  "STAGING_E2E_API_KEY_A", "STAGING_E2E_API_KEY_B",
] as const;
for (const name of required) {
  if (!process.env[name]) throw new Error(`Staging E2E requires ${name}; refusing SQLite fallback`);
}
if (process.env.QEYDAI_E2E_SQLITE === "1") {
  throw new Error("Staging E2E must never enable SQLite");
}
const expectedHost = "ep-still-lab-bct78sf9.c-16.us-east-1.aws.neon.tech";
const parsed = new URL(process.env.QEYDAI_DATABASE_URL!);
if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
  throw new Error("Staging E2E requires PostgreSQL");
}
if (parsed.hostname !== expectedHost) {
  throw new Error("Refusing non-staging Neon endpoint (hostname mismatch)");
}
if (decodeURIComponent(parsed.username) !== "panelim_staging_app") {
  throw new Error("Refusing staging E2E connection with wrong application role");
}
if (parsed.pathname !== "/neondb") {
  throw new Error("Refusing staging E2E connection with wrong database");
}

export default defineConfig({
  testDir: "tests/staging-e2e",
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  timeout: 60_000,
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- -p 3100",
    url: `${E2E_BASE_URL}/az`,
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      QEYDAI_DATABASE_URL: process.env.QEYDAI_DATABASE_URL!,
      QEYDAI_API_KEYS: JSON.stringify({
        [process.env.STAGING_E2E_API_KEY_A!]: process.env.STAGING_E2E_TENANT_A!,
        [process.env.STAGING_E2E_API_KEY_B!]: process.env.STAGING_E2E_TENANT_B!,
      }),
      QEYDAI_ADMIN_KEYS: JSON.stringify({
        [process.env.STAGING_E2E_ADMIN_KEY_A!]: process.env.STAGING_E2E_TENANT_A!,
        [process.env.STAGING_E2E_ADMIN_KEY_B!]: process.env.STAGING_E2E_TENANT_B!,
      }),
      QEYDAI_PANEL_SECRET: process.env.STAGING_E2E_PANEL_SECRET!,
      // Intentionally no QEYDAI_E2E_SQLITE / ENROLL_DB_FILE.
    },
  },
  projects: [
    { name: "staging-desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
