import type { PoolClient } from "pg";
import { getDefaultGroqModel } from "./groq";
import { isPostgresConfigured } from "../crm/store";

export type AiTone = "friendly" | "professional" | "concise";

export type WorkspaceAiSettings = {
  enabled: boolean;
  model: string;
  businessContext: string;
  systemPrompt: string;
  tone: AiTone;
  handoffKeywords: string[];
  maxRepliesPerThread: number;
  monthlyReplyLimit: number;
  updatedAt: string | null;
};

export type MonthlyAiUsage = {
  monthKey: string;
  repliesCount: number;
  copilotCount: number;
  tokensIn: number;
  tokensOut: number;
};

export const DEFAULT_HANDOFF_KEYWORDS = [
  "operator",
  "menecer",
  "manager",
  "human",
  "agent",
  "call me",
];

export function getCurrentMonthKey(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function defaultAiSettings(): WorkspaceAiSettings {
  return {
    enabled: false,
    model: getDefaultGroqModel(),
    businessContext: "",
    systemPrompt: "",
    tone: "friendly",
    handoffKeywords: [...DEFAULT_HANDOFF_KEYWORDS],
    maxRepliesPerThread: 8,
    monthlyReplyLimit: 500,
    updatedAt: null,
  };
}

// In-memory fallback for non-Postgres local dev / SQLite test harness.
const devSettings = new Map<string, WorkspaceAiSettings>();
const devUsage = new Map<string, MonthlyAiUsage>();

export async function getWorkspaceAiSettings(
  db: PoolClient,
  tenantId: string,
): Promise<WorkspaceAiSettings> {
  if (!isPostgresConfigured()) {
    return devSettings.get(tenantId) ?? defaultAiSettings();
  }
  try {
    const res = await db.query<{
      enabled: boolean;
      model: string;
      business_context: string;
      system_prompt: string;
      tone: AiTone;
      handoff_keywords: string[];
      max_replies_per_thread: number;
      monthly_reply_limit: number;
      updated_at: Date | string;
    }>(
      `SELECT enabled, model, business_context, system_prompt, tone, handoff_keywords,
              max_replies_per_thread, monthly_reply_limit, updated_at
       FROM sales_ai_settings
       WHERE tenant_id = $1`,
      [tenantId],
    );
    const row = res.rows[0];
    if (!row) return defaultAiSettings();
    return {
      enabled: Boolean(row.enabled),
      model: row.model || getDefaultGroqModel(),
      businessContext: row.business_context ?? "",
      systemPrompt: row.system_prompt ?? "",
      tone: row.tone ?? "friendly",
      handoffKeywords: Array.isArray(row.handoff_keywords) ? row.handoff_keywords : [...DEFAULT_HANDOFF_KEYWORDS],
      maxRepliesPerThread: Number(row.max_replies_per_thread ?? 8),
      monthlyReplyLimit: Number(row.monthly_reply_limit ?? 500),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "42P01") {
      return defaultAiSettings();
    }
    throw error;
  }
}

export async function upsertWorkspaceAiSettings(
  db: PoolClient,
  tenantId: string,
  patch: Partial<Omit<WorkspaceAiSettings, "updatedAt">>,
): Promise<WorkspaceAiSettings> {
  const current = await getWorkspaceAiSettings(db, tenantId);
  const next: WorkspaceAiSettings = {
    enabled: patch.enabled ?? current.enabled,
    model: patch.model ?? current.model,
    businessContext: patch.businessContext ?? current.businessContext,
    systemPrompt: patch.systemPrompt ?? current.systemPrompt,
    tone: patch.tone ?? current.tone,
    handoffKeywords: patch.handoffKeywords ?? current.handoffKeywords,
    maxRepliesPerThread: patch.maxRepliesPerThread ?? current.maxRepliesPerThread,
    monthlyReplyLimit: patch.monthlyReplyLimit ?? current.monthlyReplyLimit,
    updatedAt: new Date().toISOString(),
  };

  if (!isPostgresConfigured()) {
    devSettings.set(tenantId, next);
    return next;
  }

  const res = await db.query<{ updated_at: Date | string }>(
    `INSERT INTO sales_ai_settings
       (tenant_id, enabled, model, business_context, system_prompt, tone, handoff_keywords,
        max_replies_per_thread, monthly_reply_limit, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (tenant_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       model = EXCLUDED.model,
       business_context = EXCLUDED.business_context,
       system_prompt = EXCLUDED.system_prompt,
       tone = EXCLUDED.tone,
       handoff_keywords = EXCLUDED.handoff_keywords,
       max_replies_per_thread = EXCLUDED.max_replies_per_thread,
       monthly_reply_limit = EXCLUDED.monthly_reply_limit,
       updated_at = now()
     RETURNING updated_at`,
    [
      tenantId,
      next.enabled,
      next.model,
      next.businessContext,
      next.systemPrompt,
      next.tone,
      next.handoffKeywords,
      next.maxRepliesPerThread,
      next.monthlyReplyLimit,
    ],
  );
  return {
    ...next,
    updatedAt: res.rows[0]?.updated_at ? new Date(res.rows[0].updated_at).toISOString() : next.updatedAt,
  };
}

export async function getMonthlyAiUsage(
  db: PoolClient,
  tenantId: string,
  monthKey = getCurrentMonthKey(),
): Promise<MonthlyAiUsage> {
  if (!isPostgresConfigured()) {
    return (
      devUsage.get(`${tenantId}:${monthKey}`) ?? {
        monthKey,
        repliesCount: 0,
        copilotCount: 0,
        tokensIn: 0,
        tokensOut: 0,
      }
    );
  }
  try {
    const res = await db.query<{
      replies_count: number;
      copilot_count: number;
      tokens_in: string | number;
      tokens_out: string | number;
    }>(
      `SELECT replies_count, copilot_count, tokens_in, tokens_out
       FROM sales_ai_usage
       WHERE tenant_id = $1 AND month_key = $2`,
      [tenantId, monthKey],
    );
    const row = res.rows[0];
    return {
      monthKey,
      repliesCount: Number(row?.replies_count ?? 0),
      copilotCount: Number(row?.copilot_count ?? 0),
      tokensIn: Number(row?.tokens_in ?? 0),
      tokensOut: Number(row?.tokens_out ?? 0),
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "42P01") {
      return { monthKey, repliesCount: 0, copilotCount: 0, tokensIn: 0, tokensOut: 0 };
    }
    throw error;
  }
}

export async function incrementAiUsage(
  db: PoolClient,
  tenantId: string,
  delta: { replies?: number; copilot?: number; tokensIn?: number; tokensOut?: number },
  monthKey = getCurrentMonthKey(),
): Promise<void> {
  const replies = Math.max(0, delta.replies ?? 0);
  const copilot = Math.max(0, delta.copilot ?? 0);
  const tokensIn = Math.max(0, delta.tokensIn ?? 0);
  const tokensOut = Math.max(0, delta.tokensOut ?? 0);

  if (!isPostgresConfigured()) {
    const key = `${tenantId}:${monthKey}`;
    const cur = devUsage.get(key) ?? {
      monthKey,
      repliesCount: 0,
      copilotCount: 0,
      tokensIn: 0,
      tokensOut: 0,
    };
    devUsage.set(key, {
      monthKey,
      repliesCount: cur.repliesCount + replies,
      copilotCount: cur.copilotCount + copilot,
      tokensIn: cur.tokensIn + tokensIn,
      tokensOut: cur.tokensOut + tokensOut,
    });
    return;
  }

  await db.query(
    `INSERT INTO sales_ai_usage (tenant_id, month_key, replies_count, copilot_count, tokens_in, tokens_out, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (tenant_id, month_key) DO UPDATE SET
       replies_count = sales_ai_usage.replies_count + EXCLUDED.replies_count,
       copilot_count = sales_ai_usage.copilot_count + EXCLUDED.copilot_count,
       tokens_in = sales_ai_usage.tokens_in + EXCLUDED.tokens_in,
       tokens_out = sales_ai_usage.tokens_out + EXCLUDED.tokens_out,
       updated_at = now()`,
    [tenantId, monthKey, replies, copilot, tokensIn, tokensOut],
  );
}
