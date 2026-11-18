// Test helper run as a separate OS process (node strips the types). Tries to enroll N distinct people.
// Usage: node worker.mts <dbFile> <workerId> <attempts>   Prints: "<inserted> <full> <duplicate>"
import { SqliteEnrollmentStore } from "./sqlite-store.ts";

const [dbFile, workerId, attempts] = process.argv.slice(2);
const store = new SqliteEnrollmentStore(dbFile);
const counts = { inserted: 0, full: 0, duplicate: 0, other: 0 };
for (let i = 0; i < Number(attempts); i++) {
  const phone = `+99450${String(Number(workerId) * 1_000_000 + 1_000_000 + i).slice(-7)}`;
  const r = await store.insertIfAvailable({
    id: `${workerId}-${i}`,
    tenantId: "t1",
    sessionId: "s1",
    name: `W${workerId}-${i}`,
    phone,
    createdAt: new Date().toISOString(),
  });
  if (r === "inserted" || r === "full" || r === "duplicate") counts[r]++;
  else counts.other++;
}
store.close();
console.log(`${counts.inserted} ${counts.full} ${counts.duplicate}`);
