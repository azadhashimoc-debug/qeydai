// Seeds DEMO sessions for one tenant. Demo data only: do not use for a real center.
// Usage: node scripts/seed-demo.mts <dbFile> <tenantId> [capacity]
import { mkdirSync } from "node:fs";
import path from "node:path";
import { SqliteEnrollmentStore } from "../src/lib/enrollment/sqlite-store.ts";

const [dbFile, tenantId, cap] = process.argv.slice(2);
if (!dbFile || !tenantId) {
  console.error("usage: node scripts/seed-demo.mts <dbFile> <tenantId> [capacity]");
  process.exit(1);
}
mkdirSync(path.dirname(dbFile), { recursive: true });
const store = new SqliteEnrollmentStore(dbFile);
const capacity = Number(cap ?? 5);
const day = 24 * 3600 * 1000;
const slots = [
  { id: "demo-ielts-sat-1100", courseId: "ielts", offsetDays: 3, hour: 11 },
  { id: "demo-ielts-wed-1800", courseId: "ielts", offsetDays: 7, hour: 18 },
  { id: "demo-math-thu-1700", courseId: "math", offsetDays: 5, hour: 17 },
];
for (const s of slots) {
  const d = new Date(Date.now() + s.offsetDays * day);
  d.setUTCHours(s.hour - 4, 0, 0, 0); // Asia/Baku is UTC+4
  store.addSession({ id: s.id, tenantId, courseId: s.courseId, startsAt: d.toISOString(), capacity });
}
store.close();
console.log(`seeded ${slots.length} demo sessions for tenant ${tenantId} in ${dbFile}`);
