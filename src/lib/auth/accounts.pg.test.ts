import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { workspaceTransaction } from "@/lib/crm/store";
import { signInWithProfile } from "./accounts";
import type { Profile } from "./oauth";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const uid = () => randomUUID().replace(/-/g, "");
const profile = (over: Partial<Profile> = {}): Profile => ({
  provider: "google", providerUserId: "g_" + uid(), email: "owner@example.az", emailVerified: true, name: "Aysel Əliyeva", ...over,
});

suite("social accounts on PostgreSQL", () => {
  it("creates an account, a workspace and an owner member on first sign-in", async () => {
    const p = profile();
    const first = await signInWithProfile(p);
    expect(first.created).toBe(true);
    expect(first.tenantId).toMatch(/^ws_/);

    await workspaceTransaction(first.tenantId, async (db) => {
      const ws = await db.query("SELECT name FROM sales_workspaces WHERE id=$1", [first.tenantId]);
      expect(ws.rows[0].name).toBe("Aysel Əliyeva");
      const member = await db.query("SELECT role FROM sales_members WHERE tenant_id=$1 AND id=$2", [first.tenantId, first.memberId]);
      expect(member.rows[0].role).toBe("owner");
      const stages = await db.query("SELECT count(*)::int AS n FROM sales_stages WHERE tenant_id=$1", [first.tenantId]);
      expect(stages.rows[0].n).toBe(5);
    });
  });

  it("returns the same workspace on the next sign-in and does not create another", async () => {
    const p = profile();
    const first = await signInWithProfile(p);
    const again = await signInWithProfile(p);
    expect(again).toMatchObject({ created: false, tenantId: first.tenantId, memberId: first.memberId, accountId: first.accountId });
  });

  it("keeps identities separate: same e-mail on another provider is a different account", async () => {
    const google = await signInWithProfile(profile({ providerUserId: "same_" + uid() }));
    const facebook = await signInWithProfile(profile({ provider: "facebook", providerUserId: "fb_" + uid() }));
    expect(facebook.tenantId).not.toBe(google.tenantId);
  });

  it("handles simultaneous first sign-ins of one identity without duplicates", async () => {
    const p = profile();
    const results = await Promise.all([signInWithProfile(p), signInWithProfile(p), signInWithProfile(p)]);
    expect(new Set(results.map((r) => r.tenantId)).size).toBe(1);
    expect(results.filter((r) => r.created).length).toBe(1);
  });

  it("isolates workspaces: one tenant cannot read another's member rows (forced RLS)", async () => {
    const a = await signInWithProfile(profile());
    const b = await signInWithProfile(profile());
    await workspaceTransaction(a.tenantId, async (db) => {
      const other = await db.query("SELECT id FROM sales_members WHERE tenant_id=$1", [b.tenantId]);
      expect(other.rows).toHaveLength(0);
    });
  });
});
