import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { assertSafeApplicationRole } from "../enrollment/postgres-store";

export type AccountTokenKind = "verify_email" | "reset_password";

export const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;

const RAW_TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;

export function generateRawAccountToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccountToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function isValidAccountTokenFormat(rawToken: string): boolean {
  return RAW_TOKEN_RE.test(rawToken);
}

export type CreatedAccountToken = {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

export async function createAccountToken(
  pool: Pool,
  input: {
    tenantId: string;
    accountId: string;
    email: string;
    kind: AccountTokenKind;
    ttlMs?: number;
  },
): Promise<CreatedAccountToken> {
  const ttlMs =
    input.ttlMs ?? (input.kind === "verify_email" ? VERIFY_EMAIL_TTL_MS : RESET_PASSWORD_TTL_MS);
  const rawToken = generateRawAccountToken();
  const tokenHash = hashAccountToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMs);

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [input.tenantId]);
    // Invalidate older unused tokens of the same kind for this account.
    await db.query(
      `DELETE FROM panel_account_tokens
       WHERE tenant_id = $1 AND account_id = $2 AND kind = $3 AND used_at IS NULL`,
      [input.tenantId, input.accountId, input.kind],
    );
    await db.query(
      `INSERT INTO panel_account_tokens (token_hash, tenant_id, account_id, email, kind, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tokenHash, input.tenantId, input.accountId, input.email, input.kind, expiresAt.toISOString()],
    );
    if (Math.random() < 0.02) {
      await db.query("DELETE FROM panel_account_tokens WHERE expires_at < now()");
    }
    await db.query("COMMIT");
    return { rawToken, tokenHash, expiresAt };
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}

export type ConsumedAccountToken = {
  tenantId: string;
  accountId: string;
  email: string;
};

export async function consumeAccountToken(
  pool: Pool,
  input: { rawToken: string; kind: AccountTokenKind },
): Promise<ConsumedAccountToken | null> {
  if (!isValidAccountTokenFormat(input.rawToken)) return null;
  const tokenHash = hashAccountToken(input.rawToken);

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.token_hash', $1, true)", [tokenHash]);
    const res = await db.query<{ tenant_id: string; account_id: string; email: string }>(
      `UPDATE panel_account_tokens
       SET used_at = now()
       WHERE token_hash = $1
         AND kind = $2
         AND used_at IS NULL
         AND expires_at > now()
       RETURNING tenant_id, account_id, email`,
      [tokenHash, input.kind],
    );
    await db.query("COMMIT");
    const row = res.rows[0];
    if (!row) return null;
    return { tenantId: row.tenant_id, accountId: row.account_id, email: row.email };
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}
