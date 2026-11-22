import { getDictionary } from "@/app/[lang]/dictionaries";
import { createLoginToken } from "@/lib/auth/email-login";
import { emailConfigured, loginLink, normalizeEmail, renderLoginEmail, sendEmail } from "@/lib/auth/email";
import { clientKey, sameOrigin } from "@/lib/http/same-origin";
import { createRateLimiter } from "@/lib/rate-limit";

const ipLimiter = createRateLimiter({ max: 8, windowMs: 10 * 60_000, evictOnFull: true });
const emailLimiter = createRateLimiter({ max: 3, windowMs: 15 * 60_000, evictOnFull: true });

const json = (status: number, body: Record<string, unknown>) =>
  Response.json({ ok: status === 200, ...body }, { status, headers: { "cache-control": "no-store" } });

// Sends a one-time sign-in link. The answer never reveals whether the address already has an account.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "forbidden" });
  if (!emailConfigured()) return json(404, { error: "disabled" });
  if (!process.env.QEYDAI_DATABASE_URL) return json(503, { error: "database_unavailable" });
  if (!ipLimiter.allow(clientKey(req))) return json(429, { error: "rate_limited" });

  const text = await req.text();
  if (text.length > 2000) return json(413, { error: "payload_too_large" });
  let body: { email?: unknown; lang?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const email = normalizeEmail(body?.email);
  if (!email) return json(422, { error: "invalid_email" });
  if (!emailLimiter.allow(email)) return json(429, { error: "rate_limited" });

  const lang = body.lang === "en" ? "en" : "az";
  try {
    const raw = await createLoginToken(email);
    const link = loginLink(raw, lang);
    if (!link) return json(503, { error: "not_configured" });
    const copy = (await getDictionary(lang)).subpages.authPages.emailLink;
    const mail = renderLoginEmail(
      { subject: copy.mailSubject, intro: copy.mailIntro, button: copy.mailButton, expires: copy.mailExpires, ignore: copy.mailIgnore },
      link,
    );
    if (!(await sendEmail(email, mail))) return json(502, { error: "send_failed" });
    return json(200, {});
  } catch {
    console.error("email sign-in: request failed");
    return json(500, { error: "server_error" });
  }
}
