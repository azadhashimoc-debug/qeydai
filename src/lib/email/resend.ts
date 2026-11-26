export type EmailSendResult =
  | { ok: true; id?: string; skipped?: false }
  | { ok: false; skipped: true; reason: "email_not_configured" }
  | { ok: false; skipped?: false; reason: string };

const DEFAULT_FROM = "panelim.az <noreply@panelim.az>";

export function isEmailConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.RESEND_API_KEY?.trim());
}

export function getEmailFromAddress(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.QEYDAI_EMAIL_FROM?.trim();
  return configured || DEFAULT_FROM;
}

/**
 * Sends a transactional email via Resend REST API (zero extra npm dependencies).
 * Gracefully skips when RESEND_API_KEY is not configured.
 */
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<EmailSendResult> {
  const env = input.env ?? process.env;
  const apiKey = (env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) {
    return { ok: false, skipped: true, reason: "email_not_configured" };
  }

  const fetchFn = input.fetchImpl ?? fetch;
  try {
    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFromAddress(env),
        to: [input.to],
        subject: input.subject.slice(0, 200),
        text: input.text,
        html: input.html,
      }),
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });

    if (!res.ok) {
      return { ok: false, reason: `resend_http_${res.status}` };
    }
    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.name : "network_error" };
  }
}
