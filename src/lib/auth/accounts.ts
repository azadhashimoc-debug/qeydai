import { randomBytes } from "node:crypto";
import { initializeWorkspace, workspaceTransaction } from "../crm/store";
import { dummyPasswordHash, hashPassword, verifyPassword } from "./password";

export type CreateAccountResult =
  | { ok: true; tenantId: string; memberId: string }
  | { ok: false; reason: "email_taken" };

export type AuthenticatedAccount = { tenantId: string; memberId: string };

const AUTH_TENANT = "_auth";

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "23505" || /UNIQUE constraint failed/i.test(e?.message ?? "");
}

/** Creates a workspace, its owner member and the login account in one transaction. */
export async function createAccountWithWorkspace(input: {
  email: string;
  password: string;
  businessName: string;
}): Promise<CreateAccountResult> {
  const tenantId = `ws_${randomBytes(8).toString("hex")}`;
  const memberId = `m_${randomBytes(8).toString("hex")}`;
  const accountId = `a_${randomBytes(8).toString("hex")}`;
  const passwordHash = await hashPassword(input.password);
  try {
    const taken = await workspaceTransaction(tenantId, async (db) => {
      const existing = await db.query("SELECT 1 FROM accounts WHERE email = $1", [input.email]);
      if (existing.rows.length > 0) return true;
      await initializeWorkspace(db, tenantId);
      await db.query("UPDATE sales_workspaces SET name = $2 WHERE id = $1", [tenantId, input.businessName]);
      await db.query("INSERT INTO sales_members (tenant_id, id, name, role) VALUES ($1, $2, $3, 'owner')", [
        tenantId,
        memberId,
        input.businessName,
      ]);
      await db.query(
        "INSERT INTO accounts (id, email, password_hash, tenant_id, member_id) VALUES ($1, $2, $3, $4, $5)",
        [accountId, input.email, passwordHash, tenantId, memberId],
      );
      return false;
    });
    return taken ? { ok: false, reason: "email_taken" } : { ok: true, tenantId, memberId };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: "email_taken" };
    throw err;
  }
}

/** Returns the account's tenant/member, or null. Does the same amount of hashing work when the email is unknown. */
export async function authenticateAccount(email: string, password: string): Promise<AuthenticatedAccount | null> {
  const row = await workspaceTransaction(AUTH_TENANT, async (db) => {
    const res = await db.query<{ password_hash: string; tenant_id: string; member_id: string }>(
      "SELECT password_hash, tenant_id, member_id FROM accounts WHERE email = $1",
      [email],
    );
    return res.rows[0] ?? null;
  });
  const hash = row?.password_hash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(password, hash);
  return row && matches ? { tenantId: row.tenant_id, memberId: row.member_id } : null;
}

export async function changeAccountPassword(input: {
  tenantId: string;
  memberId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_found" | "invalid_password" }> {
  const row = await workspaceTransaction(input.tenantId, async (db) => {
    const res = await db.query<{ password_hash: string }>(
      "SELECT password_hash FROM accounts WHERE tenant_id = $1 AND member_id = $2",
      [input.tenantId, input.memberId],
    );
    return res.rows[0] ?? null;
  });
  const hash = row?.password_hash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(input.currentPassword, hash);
  if (!row) return { ok: false, reason: "not_found" };
  if (!matches) return { ok: false, reason: "invalid_password" };

  const nextHash = await hashPassword(input.newPassword);
  await workspaceTransaction(input.tenantId, async (db) => {
    await db.query(
      "UPDATE accounts SET password_hash = $3 WHERE tenant_id = $1 AND member_id = $2",
      [input.tenantId, input.memberId, nextHash],
    );
  });
  return { ok: true };
}

export async function deleteAccount(input: {
  tenantId: string;
  memberId: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_found" | "invalid_password" }> {
  const row = await workspaceTransaction(input.tenantId, async (db) => {
    const res = await db.query<{ password_hash: string }>(
      "SELECT password_hash FROM accounts WHERE tenant_id = $1 AND member_id = $2",
      [input.tenantId, input.memberId],
    );
    return res.rows[0] ?? null;
  });
  const hash = row?.password_hash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(input.password, hash);
  if (!row) return { ok: false, reason: "not_found" };
  if (!matches) return { ok: false, reason: "invalid_password" };

  await workspaceTransaction(input.tenantId, async (db) => {
    await db.query(
      "DELETE FROM accounts WHERE tenant_id = $1 AND member_id = $2",
      [input.tenantId, input.memberId],
    );
  });
  return { ok: true };
}
