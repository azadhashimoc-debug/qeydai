import type { PoolClient } from "pg";
import { tenantKnowledge } from "./auto-reply";

export const MAX_KNOWLEDGE_CHARS = 12000;

export type AiSettings = { enabled: boolean; knowledge: string; source: "database" | "env" | "none" };

/**
 * Effective AI settings for a tenant. A database row wins; when it has no text, the
 * QEYDAI_AI_KNOWLEDGE env value is the fallback. A row with enabled=false always disables the AI.
 */
export async function getAiSettings(db: PoolClient, tenant: string): Promise<AiSettings> {
  const row = await db.query<{ enabled: boolean; knowledge: string }>(
    "SELECT enabled, knowledge FROM sales_ai_settings WHERE tenant_id=$1", [tenant],
  );
  const saved = row.rows[0];
  if (saved && !saved.enabled) return { enabled: false, knowledge: saved.knowledge, source: "database" };
  if (saved?.knowledge.trim()) return { enabled: true, knowledge: saved.knowledge.trim(), source: "database" };
  const fromEnv = tenantKnowledge(tenant);
  return fromEnv ? { enabled: true, knowledge: fromEnv, source: "env" } : { enabled: true, knowledge: "", source: "none" };
}

export async function saveAiSettings(
  db: PoolClient, tenant: string, input: { enabled: boolean; knowledge: string },
): Promise<void> {
  await db.query(
    `INSERT INTO sales_ai_settings (tenant_id, enabled, knowledge) VALUES ($1,$2,$3)
     ON CONFLICT (tenant_id) DO UPDATE SET enabled=EXCLUDED.enabled, knowledge=EXCLUDED.knowledge, updated_at=now()`,
    [tenant, input.enabled, input.knowledge.slice(0, MAX_KNOWLEDGE_CHARS)],
  );
}
