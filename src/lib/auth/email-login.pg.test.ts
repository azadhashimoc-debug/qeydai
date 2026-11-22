import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { workspaceTransaction } from "@/lib/crm/store";
import { signInWithProfile } from "./accounts";
import { consumeLoginToken, createLoginToken } from "./email-login";
import { hashLoginToken } from "./email";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const address = () => `u_${randomUUID().slice(0, 12)}@example.az`;

suite("e-mail sign-in links on PostgreSQL", () => {
  it("a link works exactly once", async () => {
    const email = address();
    const raw = await createLoginToken(email);
    expect(await consumeLoginToken(raw)).toBe(email);
    expect(await consumeLoginToken(raw)).toBeNull();
  });

  it("concurrent clicks on one link sign in only once", async () => {
    const email = address();
    const raw = await createLoginToken(email);
    const results = await Promise.all([consumeLoginToken(raw), consumeLoginToken(raw), consumeLoginToken(raw)]);
    expect(results.filter((r) => r === email)).toHaveLength(1);
  });

  it("rejects unknown and expired links, and stores only a hash", async () => {
    expect(await consumeLoginToken("x".repeat(43))).toBeNull();
    const email = address();
    const raw = await createLoginToken(email);
    await workspaceTransaction("auth_global", async (db) => {
      const stored = await db.query("SELECT token_hash, email FROM panel_login_tokens WHERE token_hash=$1", [hashLoginToken(raw)]);
      expect(stored.rows[0].email).toBe(email);
      expect(stored.rows[0].token_hash).not.toContain(raw);
      await db.query("UPDATE panel_login_tokens SET expires_at = now() - interval '1 minute' WHERE token_hash=$1", [hashLoginToken(raw)]);
    });
    expect(await consumeLoginToken(raw)).toBeNull();
  });

  it("the e-mail identity creates one workspace and returns it on the next sign-in", async () => {
    const email = address();
    const first = await signInWithProfile({ provider: "email", providerUserId: email, email, emailVerified: true, name: "" });
    expect(first.created).toBe(true);
    await workspaceTransaction(first.tenantId, async (db) => {
      const ws = await db.query("SELECT name FROM sales_workspaces WHERE id=$1", [first.tenantId]);
      expect(ws.rows[0].name).toBe(email.split("@")[0]);
    });
    const again = await signInWithProfile({ provider: "email", providerUserId: email, email, emailVerified: true, name: "" });
    expect(again).toMatchObject({ created: false, tenantId: first.tenantId });
    // the same address through Google is a separate identity, never an automatic link
    const google = await signInWithProfile({ provider: "google", providerUserId: "g_" + randomUUID(), email, emailVerified: true, name: "G" });
    expect(google.tenantId).not.toBe(first.tenantId);
  });
});
