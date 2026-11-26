// Applies db/migrations/*.sql to the Postgres database in QEYDAI_DATABASE_URL, in filename order.
//
//   npm run migrate              apply pending migrations
//   npm run migrate -- --status  show applied / pending, change nothing
//   npm run migrate -- --baseline  record every file as applied WITHOUT running it
//                                  (for a database whose schema was applied by hand)
//
// Each file runs in its own transaction. Applied files are tracked in schema_migrations with a
// checksum; a file edited after it was applied stops the run instead of being silently skipped.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const dir = path.resolve(import.meta.dirname, "../db/migrations");
const mode = process.argv.includes("--status") ? "status" : process.argv.includes("--baseline") ? "baseline" : "apply";
const rawUrl = process.env.QEYDAI_DATABASE_URL;

if (!rawUrl) {
  console.error("QEYDAI_DATABASE_URL is not set.");
  process.exit(2);
}

function normalizeMigrationUrl(input: string): string {
  try {
    const parsed = new URL(input.trim());
    const host = parsed.hostname.toLowerCase();
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
    const sslmode = parsed.searchParams.get("sslmode")?.toLowerCase();
    if (!local && (sslmode === "require" || sslmode === "prefer" || sslmode === "allow")) {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
  } catch {
    // Keep original connection string if not a standard URL.
  }
  return input;
}

const url = normalizeMigrationUrl(rawUrl);

const files = readdirSync(dir)
  .filter((f) => /^\d{4}_.+\.sql$/.test(f))
  .sort();
const checksum = (text: string) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");

const client = new Client({ connectionString: url, connectionTimeoutMillis: 8000 });
let failed = false;

try {
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  // One migrator at a time, even if two deploys start together.
  await client.query("SELECT pg_advisory_lock(hashtextextended('qeydai_migrate', 0))");

  const rows = await client.query<{ name: string; checksum: string }>("SELECT name, checksum FROM schema_migrations");
  const applied = new Map(rows.rows.map((r) => [r.name, r.checksum]));

  for (const file of files) {
    const text = readFileSync(path.join(dir, file), "utf8");
    const sum = checksum(text);
    const known = applied.get(file);

    if (known) {
      if (known !== sum) {
        console.error(`CHANGED   ${file} was edited after it was applied. Add a new migration instead.`);
        failed = true;
        break;
      }
      console.log(`applied   ${file}`);
      continue;
    }
    if (mode === "status") {
      console.log(`pending   ${file}`);
      continue;
    }
    if (mode === "baseline") {
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [file, sum]);
      console.log(`baseline  ${file}`);
      continue;
    }
    try {
      await client.query("BEGIN");
      await client.query(text);
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [file, sum]);
      await client.query("COMMIT");
      console.log(`applied   ${file} (new)`);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error(`FAILED    ${file}: ${err instanceof Error ? err.message : String(err)}`);
      failed = true;
      break;
    }
  }
} catch (err) {
  console.error(`Could not run migrations: ${err instanceof Error ? err.message : String(err)}`);
  failed = true;
} finally {
  await client.end().catch(() => undefined);
}

process.exit(failed ? 1 : 0);
