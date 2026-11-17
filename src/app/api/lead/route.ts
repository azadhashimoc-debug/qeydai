import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { validateLead } from "@/lib/leads/leads";

// Local MVP storage: data/leads.jsonl (gitignored). Replaced by PostgreSQL in the SaaS phase.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const v = validateLead(body);
  if (!v.ok) return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });

  const file = process.env.LEADS_FILE ?? path.join(process.cwd(), "data", "leads.jsonl");
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify({ ...v.lead, createdAt: new Date().toISOString() }) + "\n", "utf8");
  return Response.json({ ok: true });
}
