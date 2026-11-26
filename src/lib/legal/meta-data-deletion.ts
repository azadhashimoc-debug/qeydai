import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type MetaSignedRequestPayload = {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
};

function decodeBase64Url(input: string): Buffer | null {
  if (!input || !/^[A-Za-z0-9_-]+$/.test(input)) return null;
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  try {
    return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  } catch {
    return null;
  }
}

/**
 * Verifies a Meta (Facebook/Instagram) signed_request using HMAC-SHA256.
 * Returns the parsed JSON payload on valid signature, or null otherwise.
 */
export function verifyMetaSignedRequest(
  signedRequest: string,
  appSecret: string,
): MetaSignedRequestPayload | null {
  const secret = appSecret.trim();
  if (!secret || !signedRequest) return null;
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;
  const [encodedSig, encodedPayload] = parts;
  const sig = decodeBase64Url(encodedSig);
  const payloadBuf = decodeBase64Url(encodedPayload);
  if (!sig || !payloadBuf) return null;

  const expected = createHmac("sha256", secret).update(encodedPayload).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadBuf.toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as MetaSignedRequestPayload;
  if (obj.algorithm && obj.algorithm.toUpperCase() !== "HMAC-SHA256") return null;
  if (typeof obj.user_id !== "string" || obj.user_id.trim().length === 0) return null;
  return obj;
}

/**
 * Produces a non-PII confirmation code tied to the Meta user_id and timestamp.
 */
export function buildDeletionConfirmationCode(userId: string, nowMs = Date.now()): string {
  const digest = createHash("sha256")
    .update(`meta-deletion:${userId}:${Math.floor(nowMs / 1000)}`)
    .digest("hex")
    .slice(0, 16);
  return `del_${digest}`;
}
