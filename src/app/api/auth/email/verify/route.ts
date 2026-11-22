import { signInWithProfile } from "@/lib/auth/accounts";
import { consumeLoginToken } from "@/lib/auth/email-login";
import { normalizeEmail } from "@/lib/auth/email";
import { issueSessionCookie } from "@/lib/auth/session";
import { clientKey, sameOrigin } from "@/lib/http/same-origin";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter({ max: 20, windowMs: 60_000, evictOnFull: true });

const json = (status: number, body: Record<string, unknown>, headers: HeadersInit = {}) =>
  Response.json({ ok: status === 200, ...body }, { status, headers: { "cache-control": "no-store", ...headers } });

// Called by the confirmation page (a button press, so mail scanners that prefetch links cannot burn the token).
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "forbidden" });
  if (!process.env.QEYDAI_DATABASE_URL) return json(503, { error: "database_unavailable" });
  if (!limiter.allow(clientKey(req))) return json(429, { error: "rate_limited" });

  const text = await req.text();
  if (text.length > 2000) return json(413, { error: "payload_too_large" });
  let token: unknown;
  try {
    token = (JSON.parse(text) as { token?: unknown })?.token;
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (typeof token !== "string") return json(400, { error: "invalid_token" });

  try {
    const email = normalizeEmail(await consumeLoginToken(token));
    if (!email) return json(400, { error: "invalid_token" });
    const signedIn = await signInWithProfile({
      provider: "email", providerUserId: email, email, emailVerified: true, name: "",
    });
    const cookie = await issueSessionCookie(req, signedIn);
    if (!cookie) return json(503, { error: "database_unavailable" });
    return json(200, { created: signedIn.created }, { "set-cookie": cookie });
  } catch {
    console.error("email sign-in: verify failed");
    return json(500, { error: "server_error" });
  }
}
