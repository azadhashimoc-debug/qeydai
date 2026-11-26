export type CheckSeverity = "ok" | "warn" | "fail";

export type EnvCheckItem = {
  key: string;
  severity: CheckSeverity;
  message: string;
};

export type EnvCheckReport = {
  ok: boolean;
  items: EnvCheckItem[];
};

const PLACEHOLDER_RE = /replace_with|changeme|example|your[_-]?secret/i;
const SAFE_TRACKING_ID_RE = /^[A-Za-z0-9_-]{3,40}$/;

function isValidJsonObject(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function isValidJsonArray(raw: string): boolean {
  try {
    return Array.isArray(JSON.parse(raw));
  } catch {
    return false;
  }
}

export function validateProductionEnv(env: Record<string, string | undefined>): EnvCheckReport {
  const items: EnvCheckItem[] = [];

  const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (!siteUrl) {
    items.push({ key: "NEXT_PUBLIC_SITE_URL", severity: "fail", message: "Missing canonical site URL." });
  } else {
    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol === "https:") {
        items.push({ key: "NEXT_PUBLIC_SITE_URL", severity: "ok", message: `Configured (${parsed.origin}).` });
      } else {
        items.push({
          key: "NEXT_PUBLIC_SITE_URL",
          severity: "warn",
          message: `Non-HTTPS URL (${parsed.protocol}); production should use https://.`,
        });
      }
    } catch {
      items.push({ key: "NEXT_PUBLIC_SITE_URL", severity: "fail", message: "Invalid URL format." });
    }
  }

  const dbUrl = (env.QEYDAI_DATABASE_URL ?? "").trim();
  if (!dbUrl) {
    items.push({
      key: "QEYDAI_DATABASE_URL",
      severity: "fail",
      message: "Missing PostgreSQL URL (app would fall back to local SQLite).",
    });
  } else if (!/^postgres(ql)?:\/\/.+/i.test(dbUrl) || PLACEHOLDER_RE.test(dbUrl)) {
    items.push({
      key: "QEYDAI_DATABASE_URL",
      severity: "fail",
      message: "Must be a real postgresql:// connection string.",
    });
  } else {
    items.push({ key: "QEYDAI_DATABASE_URL", severity: "ok", message: "PostgreSQL connection string set." });
  }

  const secret = (env.QEYDAI_PANEL_SECRET ?? "").trim();
  if (secret.length < 24 || PLACEHOLDER_RE.test(secret)) {
    items.push({
      key: "QEYDAI_PANEL_SECRET",
      severity: "fail",
      message: "Must be a generated secret of at least 24 characters.",
    });
  } else {
    items.push({ key: "QEYDAI_PANEL_SECRET", severity: "ok", message: "Session signing secret set." });
  }

  const trustProxy = (env.TRUST_PROXY ?? "").trim();
  if (!trustProxy) {
    items.push({
      key: "TRUST_PROXY",
      severity: "warn",
      message: "Unset. Set to vercel, x-forwarded-for, or x-real-ip when running behind a reverse proxy.",
    });
  } else if (trustProxy === "vercel" || trustProxy === "x-forwarded-for" || trustProxy === "x-real-ip") {
    items.push({ key: "TRUST_PROXY", severity: "ok", message: `Set to ${trustProxy}.` });
  } else {
    items.push({
      key: "TRUST_PROXY",
      severity: "fail",
      message: "Invalid value. Use vercel, x-forwarded-for, or x-real-ip.",
    });
  }

  for (const jsonKey of ["QEYDAI_API_KEYS", "QEYDAI_ADMIN_KEYS"] as const) {
    const raw = (env[jsonKey] ?? "").trim();
    if (!raw) continue;
    if (!isValidJsonObject(raw) || PLACEHOLDER_RE.test(raw)) {
      items.push({ key: jsonKey, severity: "fail", message: "Invalid JSON object or contains placeholder." });
    } else {
      items.push({ key: jsonKey, severity: "ok", message: "Valid JSON map." });
    }
  }

  const channelsRaw = (env.QEYDAI_CRM_CHANNELS ?? "").trim();
  if (channelsRaw) {
    if (!isValidJsonArray(channelsRaw)) {
      items.push({ key: "QEYDAI_CRM_CHANNELS", severity: "fail", message: "Must be a valid JSON array." });
    } else {
      items.push({ key: "QEYDAI_CRM_CHANNELS", severity: "ok", message: "Valid JSON channel array." });
    }
  }

  const encKey = (env.QEYDAI_CHANNELS_ENCRYPTION_KEY ?? "").trim();
  if (encKey) {
    if (encKey.length < 24 || PLACEHOLDER_RE.test(encKey)) {
      items.push({
        key: "QEYDAI_CHANNELS_ENCRYPTION_KEY",
        severity: "fail",
        message: "Must be at least 24 characters without placeholders.",
      });
    } else {
      items.push({ key: "QEYDAI_CHANNELS_ENCRYPTION_KEY", severity: "ok", message: "Channel encryption key set." });
    }
  }

  const paycellSecret = (env.QEYDAI_PAYCELL_WEBHOOK_SECRET ?? "").trim();
  const paycellUrl = (env.QEYDAI_PAYCELL_CHECKOUT_URL ?? "").trim();
  if (Boolean(paycellSecret) !== Boolean(paycellUrl)) {
    items.push({
      key: "QEYDAI_PAYCELL_*",
      severity: "warn",
      message: "Only one of QEYDAI_PAYCELL_WEBHOOK_SECRET / QEYDAI_PAYCELL_CHECKOUT_URL is set.",
    });
  } else if (paycellSecret && paycellUrl) {
    items.push({ key: "QEYDAI_PAYCELL_*", severity: "ok", message: "Paycell billing credentials set." });
  }

  const opsToken = (env.QEYDAI_OPS_TELEGRAM_BOT_TOKEN ?? "").trim();
  const opsChat = (env.QEYDAI_OPS_TELEGRAM_CHAT_ID ?? "").trim();
  if (Boolean(opsToken) !== Boolean(opsChat)) {
    items.push({
      key: "QEYDAI_OPS_TELEGRAM_*",
      severity: "warn",
      message: "Set both QEYDAI_OPS_TELEGRAM_BOT_TOKEN and QEYDAI_OPS_TELEGRAM_CHAT_ID for alerts.",
    });
  } else if (opsToken && opsChat) {
    items.push({ key: "QEYDAI_OPS_TELEGRAM_*", severity: "ok", message: "Ops Telegram alerting configured." });
  }

  const groqKey = (env.GROQ_API_KEY ?? "").trim();
  if (groqKey) {
    items.push(
      PLACEHOLDER_RE.test(groqKey)
        ? { key: "GROQ_API_KEY", severity: "fail", message: "Contains placeholder value." }
        : { key: "GROQ_API_KEY", severity: "ok", message: "Groq Pani AI API key set." },
    );
  }

  const resendKey = (env.RESEND_API_KEY ?? "").trim();
  if (resendKey) {
    items.push(
      PLACEHOLDER_RE.test(resendKey)
        ? { key: "RESEND_API_KEY", severity: "fail", message: "Contains placeholder value." }
        : { key: "RESEND_API_KEY", severity: "ok", message: "Resend transactional email key set." },
    );
  }

  for (const trackKey of [
    "NEXT_PUBLIC_GTM_ID",
    "NEXT_PUBLIC_GA_ID",
    "NEXT_PUBLIC_CLARITY_ID",
    "NEXT_PUBLIC_META_PIXEL_ID",
    "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
    "NEXT_PUBLIC_LINKEDIN_PARTNER_ID",
    "NEXT_PUBLIC_BING_UET_ID",
  ] as const) {
    const raw = (env[trackKey] ?? "").trim();
    if (!raw) continue;
    if (!SAFE_TRACKING_ID_RE.test(raw)) {
      items.push({ key: trackKey, severity: "fail", message: "Invalid tracking ID format." });
    } else {
      items.push({ key: trackKey, severity: "ok", message: "Valid tracking ID." });
    }
  }

  return {
    ok: !items.some((item) => item.severity === "fail"),
    items,
  };
}

/**
 * Full commercial launch readiness audit: includes all baseline checks plus warnings
 * for external launch integrations (Groq AI, Resend email, Cron secret, Paycell, WhatsApp).
 */
export function validateLaunchReadiness(env: Record<string, string | undefined>): EnvCheckReport {
  const base = validateProductionEnv(env);
  const items = [...base.items];

  const requiredForLaunch: Array<[string, string]> = [
    ["GROQ_API_KEY", "Required for Pani AI auto-replies and live Copilot."],
    ["RESEND_API_KEY", "Required for email verification and password reset emails."],
    ["CRON_SECRET", "Required for scheduled /api/channels/deliver Vercel Cron authentication."],
    ["QEYDAI_PUBLIC_LEAD_TENANT", "Set to your real workspace ID so website demo leads appear in your CRM."],
    ["QEYDAI_PAYCELL_CHECKOUT_URL", "Required for live Paycell card payments."],
    ["NEXT_PUBLIC_WHATSAPP_NUMBER", "Set to your real WhatsApp Business phone number (digits only)."],
  ];

  for (const [key, message] of requiredForLaunch) {
    if (!(env[key] ?? "").trim()) {
      items.push({ key, severity: "warn", message });
    }
  }

  return {
    ok: !items.some((item) => item.severity === "fail"),
    items,
  };
}
