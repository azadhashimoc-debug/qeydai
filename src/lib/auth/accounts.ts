import { randomUUID } from "node:crypto";
import { createMember, initializeWorkspace, workspaceTransaction } from "@/lib/crm/store";
import type { Profile } from "./oauth";

export type SignedIn = { accountId: string; tenantId: string; memberId: string; created: boolean };

type Row = { id: string; tenant_id: string; member_id: string };

const short = () => randomUUID().replace(/-/g, "").slice(0, 20);

/**
 * Finds the account for a provider identity, or creates account + workspace + owner member in one transaction.
 * Identity is (provider, provider_user_id) only: e-mail is stored for display and never used to link accounts.
 */
export async function signInWithProfile(profile: Profile): Promise<SignedIn> {
  const attempt = () => {
    const newTenant = `ws_${short()}`;
    const newMember = `m_${short()}`;
    const newAccount = `acc_${short()}`;
    return workspaceTransaction(newTenant, async (db): Promise<SignedIn> => {
      const found = await db.query<Row>(
        "SELECT id, tenant_id, member_id FROM panel_accounts WHERE provider=$1 AND provider_user_id=$2",
        [profile.provider, profile.providerUserId],
      );
      const row = found.rows[0];
      if (row) {
        await db.query("UPDATE panel_accounts SET last_login_at=now() WHERE id=$1", [row.id]);
        return { accountId: row.id, tenantId: row.tenant_id, memberId: row.member_id, created: false };
      }

      const display = profile.name || (profile.email ? profile.email.split("@")[0] : "") || "Owner";
      await initializeWorkspace(db, newTenant);
      await db.query("UPDATE sales_workspaces SET name=$2 WHERE id=$1", [newTenant, display.slice(0, 120)]);
      await createMember(db, newTenant, newMember, display.slice(0, 120), "owner");
      await db.query(
        `INSERT INTO panel_accounts (id, provider, provider_user_id, email, name, tenant_id, member_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [newAccount, profile.provider, profile.providerUserId, profile.email, display.slice(0, 120), newTenant, newMember],
      );
      return { accountId: newAccount, tenantId: newTenant, memberId: newMember, created: true };
    });
  };

  try {
    return await attempt();
  } catch (error) {
    // Two first sign-ins of the same identity racing: the loser rolled back, so look the winner up.
    if ((error as { code?: string }).code === "23505") return attempt();
    throw error;
  }
}
