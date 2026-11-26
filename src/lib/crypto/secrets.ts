import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1:";
const KEY_DOMAIN = "panelim:channel-secrets:v1:";

function deriveKey(env: Record<string, string | undefined>): Buffer | null {
  const dedicated = (env.QEYDAI_CHANNELS_ENCRYPTION_KEY ?? "").trim();
  const fallback = (env.QEYDAI_PANEL_SECRET ?? "").trim();
  const raw = dedicated.length >= 24 ? dedicated : fallback.length >= 24 ? fallback : "";
  if (!raw) return null;
  return createHash("sha256").update(KEY_DOMAIN).update(raw).digest();
}

export function hasChannelEncryptionKey(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return deriveKey(env) !== null;
}

/**
 * Encrypts sensitive channel credentials (bot tokens, Meta access tokens, webhook secrets)
 * with AES-256-GCM before persisting them to PostgreSQL.
 */
export function encryptSecret(
  plaintext: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const key = deriveKey(env);
  if (!key) throw new Error("channel_encryption_key_missing");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(
  encoded: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!encoded || !encoded.startsWith(PREFIX)) return null;
  const key = deriveKey(env);
  if (!key) return null;
  const parts = encoded.slice(PREFIX.length).split(":");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "base64url");
    const tag = Buffer.from(parts[1], "base64url");
    const ciphertext = Buffer.from(parts[2], "base64url");
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}
