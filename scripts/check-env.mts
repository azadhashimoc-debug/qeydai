import { validateProductionEnv } from "../src/lib/deploy/check-env.ts";

const report = validateProductionEnv(process.env);

for (const item of report.items) {
  const tag = item.severity === "ok" ? "OK  " : item.severity === "warn" ? "WARN" : "FAIL";
  console.log(`[${tag}] ${item.key}: ${item.message}`);
}

if (!report.ok) {
  console.error("\nProduction environment preflight failed.");
  process.exit(1);
}

console.log("\nProduction environment preflight passed.");
