import { createHash, randomBytes } from "node:crypto";
import { siteUrl } from "./oauth";

// Passwordless e-mail sign-in: a one-time link sent through Resend (https://resend.com).
// The API key and sender come only from the environment and are never logged.

type Env = Record<string, string | undefined>;

export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** Lower-cased, trimmed address, or null when it is not a plausible e-mail. */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (value.length < 6 || value.length > 254 || !EMAIL_RE.test(value)) return null;
  return value;
}

/** E-mail sign-in is on only when a Resend key, a sender address and the public site URL are all set. */
export function emailConfigured(env: Env = process.env): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim() && siteUrl(env));
}

export function newLoginToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashLoginToken(raw) };
}

export function hashLoginToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function loginLink(raw: string, lang: "az" | "en", env: Env = process.env): string | null {
  const base = siteUrl(env);
  return base ? `${base}/${lang}/login/confirm?token=${encodeURIComponent(raw)}` : null;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type LoginMailCopy = { subject: string; intro: string; button: string; expires: string; ignore: string };

export function renderLoginEmail(copy: LoginMailCopy, link: string): { subject: string; html: string; text: string } {
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
<p style="font-size:16px">${escapeHtml(copy.intro)}</p>
<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#1a1240;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(copy.button)}</a></p>
<p style="font-size:13px;color:#555">${escapeHtml(copy.expires)}</p>
<p style="font-size:13px;color:#555">${escapeHtml(copy.ignore)}</p>
</div>`;
  const text = `${copy.intro}\n\n${link}\n\n${copy.expires}\n${copy.ignore}\n`;
  return { subject: copy.subject, html, text };
}

/** Sends one message through Resend. Returns false on any failure; never throws or logs the address or key. */
export async function sendEmail(
  to: string,
  message: { subject: string; html: string; text: string },
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!key || !from) return false;
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [to], subject: message.subject, html: message.html, text: message.text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.warn(`email: provider responded ${res.status}`);
    return res.ok;
  } catch {
    console.warn("email: send failed");
    return false;
  }
}
