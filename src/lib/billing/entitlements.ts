import type { PoolClient } from "pg";
import type { Channel } from "../crm/channels";
import { isPostgresConfigured } from "../crm/store";
import type { PaycellEvent, PaycellPeriod } from "./paycell";

export type WorkspacePlanCode = "trial" | "starter" | "growth" | "pro" | "enterprise";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export type PlanLimits = {
  maxChannels: number;
  maxMembers: number;
  maxMonthlyAiReplies: number;
  maxDeals: number;
};

export const PLAN_LIMITS: Record<WorkspacePlanCode, PlanLimits> = {
  trial: {
    maxChannels: 3,
    maxMembers: 5,
    maxMonthlyAiReplies: 200,
    maxDeals: 500,
  },
  starter: {
    maxChannels: 0,
    maxMembers: 2,
    maxMonthlyAiReplies: 300,
    maxDeals: 500,
  },
  growth: {
    maxChannels: 1,
    maxMembers: 5,
    maxMonthlyAiReplies: 1500,
    maxDeals: 3000,
  },
  pro: {
    maxChannels: 1,
    maxMembers: 15,
    maxMonthlyAiReplies: 5000,
    maxDeals: 20000,
  },
  enterprise: {
    maxChannels: 100,
    maxMembers: 500,
    maxMonthlyAiReplies: 100000,
    maxDeals: 1000000,
  },
};

export function planAllowsChannel(plan: WorkspacePlanCode, channel: Channel): boolean {
  if (plan === "starter") return false;
  if (plan === "growth" || plan === "pro") return channel === "whatsapp";
  return true;
}

export type WorkspaceSubscriptionRow = {
  planCode: WorkspacePlanCode;
  subscriptionStatus: SubscriptionStatus;
  trialStartsAt: Date;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
};

export type WorkspaceEntitlement = {
  planCode: WorkspacePlanCode;
  status: SubscriptionStatus;
  canWrite: boolean;
  trialEndsAt: string;
  trialDaysLeft: number;
  currentPeriodEnd: string | null;
  limits: PlanLimits;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function periodDurationDays(period: PaycellPeriod): number {
  if (period === "annual") return 365;
  if (period === "halfYear") return 180;
  return 30;
}

export function computeEntitlement(
  row: WorkspaceSubscriptionRow,
  now = new Date(),
): WorkspaceEntitlement {
  const limits = PLAN_LIMITS[row.planCode] ?? PLAN_LIMITS.trial;
  const nowMs = now.getTime();
  const trialEndMs = row.trialEndsAt.getTime();
  const periodEndMs = row.currentPeriodEnd ? row.currentPeriodEnd.getTime() : null;

  let status: SubscriptionStatus = row.subscriptionStatus;
  let canWrite = false;
  let trialDaysLeft = 0;

  if (row.subscriptionStatus === "active") {
    if (periodEndMs !== null && periodEndMs <= nowMs) {
      status = "expired";
      canWrite = false;
    } else {
      status = "active";
      canWrite = true;
    }
  } else if (row.subscriptionStatus === "trialing") {
    if (trialEndMs > nowMs) {
      status = "trialing";
      canWrite = true;
      trialDaysLeft = Math.max(1, Math.ceil((trialEndMs - nowMs) / DAY_MS));
    } else {
      status = "expired";
      canWrite = false;
      trialDaysLeft = 0;
    }
  } else {
    status = row.subscriptionStatus;
    canWrite = false;
  }

  return {
    planCode: row.planCode,
    status,
    canWrite,
    trialEndsAt: row.trialEndsAt.toISOString(),
    trialDaysLeft,
    currentPeriodEnd: row.currentPeriodEnd ? row.currentPeriodEnd.toISOString() : null,
    limits,
  };
}

function defaultTrialRow(now = new Date()): WorkspaceSubscriptionRow {
  return {
    planCode: "trial",
    subscriptionStatus: "trialing",
    trialStartsAt: now,
    trialEndsAt: new Date(now.getTime() + 14 * DAY_MS),
    currentPeriodEnd: null,
  };
}

export async function getWorkspaceEntitlement(
  db: PoolClient,
  tenantId: string,
  now = new Date(),
): Promise<WorkspaceEntitlement> {
  if (!isPostgresConfigured()) {
    return computeEntitlement(defaultTrialRow(now), now);
  }
  await db.query("SAVEPOINT sp_entitlement_read");
  try {
    const res = await db.query<{
      plan_code: WorkspacePlanCode;
      subscription_status: SubscriptionStatus;
      trial_starts_at: Date | string;
      trial_ends_at: Date | string;
      current_period_end: Date | string | null;
    }>(
      `SELECT plan_code, subscription_status, trial_starts_at, trial_ends_at, current_period_end
       FROM sales_workspaces
       WHERE id = $1`,
      [tenantId],
    );
    await db.query("RELEASE SAVEPOINT sp_entitlement_read");
    const r = res.rows[0];
    if (!r) return computeEntitlement(defaultTrialRow(now), now);
    return computeEntitlement(
      {
        planCode: r.plan_code ?? "trial",
        subscriptionStatus: r.subscription_status ?? "trialing",
        trialStartsAt: new Date(r.trial_starts_at),
        trialEndsAt: new Date(r.trial_ends_at),
        currentPeriodEnd: r.current_period_end ? new Date(r.current_period_end) : null,
      },
      now,
    );
  } catch (error) {
    await db.query("ROLLBACK TO SAVEPOINT sp_entitlement_read").catch(() => {});
    await db.query("RELEASE SAVEPOINT sp_entitlement_read").catch(() => {});
    // Migration 0014 not yet applied: treat workspace as active trial until migrated.
    if (error && typeof error === "object" && "code" in error && error.code === "42703") {
      return computeEntitlement(defaultTrialRow(now), now);
    }
    throw error;
  }
}

export async function applyPaycellEventToWorkspace(
  db: PoolClient,
  tenantId: string,
  event: PaycellEvent,
): Promise<void> {
  if (!isPostgresConfigured()) return;
  await db.query("SAVEPOINT sp_entitlement_write");
  try {
    if (event.status === "paid") {
      const days = periodDurationDays(event.period);
      await db.query(
        `UPDATE sales_workspaces
         SET plan_code = $2,
             subscription_status = 'active',
             current_period_end = GREATEST(COALESCE(current_period_end, now()), now()) + ($3 * interval '1 day')
         WHERE id = $1`,
        [tenantId, event.plan, days],
      );
      const planLimit = PLAN_LIMITS[event.plan]?.maxMonthlyAiReplies ?? 500;
      await db.query("SAVEPOINT sp_ai_limit_sync");
      try {
        await db.query(
          `UPDATE sales_ai_settings
           SET monthly_reply_limit = $2, updated_at = now()
           WHERE tenant_id = $1`,
          [tenantId, planLimit],
        );
        await db.query("RELEASE SAVEPOINT sp_ai_limit_sync");
      } catch {
        await db.query("ROLLBACK TO SAVEPOINT sp_ai_limit_sync").catch(() => {});
        await db.query("RELEASE SAVEPOINT sp_ai_limit_sync").catch(() => {});
      }
    } else if (event.status === "refunded") {
      await db.query(
        `UPDATE sales_workspaces
         SET subscription_status = 'canceled'
         WHERE id = $1`,
        [tenantId],
      );
    } else if (event.status === "failed") {
      await db.query(
        `UPDATE sales_workspaces
         SET subscription_status = CASE WHEN subscription_status = 'active' THEN 'past_due' ELSE subscription_status END
         WHERE id = $1`,
        [tenantId],
      );
    }
    await db.query("RELEASE SAVEPOINT sp_entitlement_write");
  } catch (error) {
    await db.query("ROLLBACK TO SAVEPOINT sp_entitlement_write").catch(() => {});
    await db.query("RELEASE SAVEPOINT sp_entitlement_write").catch(() => {});
    // Migration 0014 not yet applied: do not reject a verified Paycell webhook.
    if (!(error && typeof error === "object" && "code" in error && error.code === "42703")) {
      throw error;
    }
  }
}

export type LimitCheckResult =
  | { ok: true; entitlement: WorkspaceEntitlement }
  | {
      ok: false;
      status: 402;
      error: "subscription_required" | "plan_limit_reached";
      resource?: "channels" | "members" | "deals";
      limit?: number;
      current?: number;
      plan?: WorkspacePlanCode;
    };

export async function enforceWorkspaceLimit(
  db: PoolClient,
  tenantId: string,
  resource: "channels" | "members" | "deals",
  options: { skipCountCheck?: boolean; channel?: Channel; activeChannels?: readonly Channel[] } = {},
): Promise<LimitCheckResult> {
  const entitlement = await getWorkspaceEntitlement(db, tenantId);
  if (!entitlement.canWrite) {
    return {
      ok: false,
      status: 402,
      error: "subscription_required",
      plan: entitlement.planCode,
    };
  }
  if (
    resource === "channels" &&
    (entitlement.limits.maxChannels === 0 ||
      (options.channel !== undefined && !planAllowsChannel(entitlement.planCode, options.channel)))
  ) {
    return {
      ok: false,
      status: 402,
      error: "plan_limit_reached",
      resource,
      limit: 0,
      plan: entitlement.planCode,
    };
  }
  if (options.skipCountCheck || !isPostgresConfigured()) {
    return { ok: true, entitlement };
  }

  let current = 0;
  let limit = 0;
  if (resource === "channels") {
    limit = entitlement.limits.maxChannels;
    if (options.activeChannels) {
      current = options.activeChannels.filter((channel) => planAllowsChannel(entitlement.planCode, channel)).length;
    } else {
      const res = await db.query<{ cnt: string }>(
        "SELECT count(*)::text AS cnt FROM sales_connections WHERE tenant_id = $1 AND active = true",
        [tenantId],
      );
      current = Number(res.rows[0]?.cnt ?? 0);
    }
  } else if (resource === "members") {
    limit = entitlement.limits.maxMembers;
    const res = await db.query<{ cnt: string }>(
      "SELECT count(*)::text AS cnt FROM sales_members WHERE tenant_id = $1",
      [tenantId],
    );
    current = Number(res.rows[0]?.cnt ?? 0);
  } else if (resource === "deals") {
    limit = entitlement.limits.maxDeals;
    const res = await db.query<{ cnt: string }>(
      "SELECT count(*)::text AS cnt FROM sales_deals WHERE tenant_id = $1",
      [tenantId],
    );
    current = Number(res.rows[0]?.cnt ?? 0);
  }

  if (current >= limit) {
    return {
      ok: false,
      status: 402,
      error: "plan_limit_reached",
      resource,
      limit,
      current,
      plan: entitlement.planCode,
    };
  }

  return { ok: true, entitlement };
}
