import { workspaceTransaction } from "@/lib/crm/store";
import { LOGIN_TOKEN_TTL_MS, hashLoginToken, newLoginToken } from "./email";

// panel_login_tokens is a global table (no tenant); the transaction tenant is only a placeholder.
const GLOBAL = "auth_global";

/** Stores a fresh one-time token for the address and returns the raw value to put in the e-mail link. */
export async function createLoginToken(email: string): Promise<string> {
  const { raw, hash } = newLoginToken();
  await workspaceTransaction(GLOBAL, async (db) => {
    // Keep the table small: drop tokens that expired more than a day ago.
    await db.query("DELETE FROM panel_login_tokens WHERE expires_at < now() - interval '1 day'");
    await db.query(
      "INSERT INTO panel_login_tokens (token_hash, email, expires_at) VALUES ($1,$2, now() + ($3 || ' milliseconds')::interval)",
      [hash, email, String(LOGIN_TOKEN_TTL_MS)],
    );
  });
  return raw;
}

/**
 * Atomically marks the token used and returns its e-mail, or null when it is unknown, expired or already used.
 * The single UPDATE ... WHERE used_at IS NULL makes the link strictly one-time even under concurrent clicks.
 */
export async function consumeLoginToken(raw: string): Promise<string | null> {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 200) return null;
  return workspaceTransaction(GLOBAL, async (db) => {
    const r = await db.query<{ email: string }>(
      `UPDATE panel_login_tokens SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING email`,
      [hashLoginToken(raw)],
    );
    return r.rows[0]?.email ?? null;
  });
}
