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
      message: "Unset. Set to x-forwarded-for or x-real-ip when running behind Nginx.",
    });
  } else if (trustProxy === "x-forwarded-for" || trustProxy === "x-real-ip") {
    items.push({ key: "TRUST_PROXY", severity: "ok", message: `Set to ${trustProxy}.` });
  } else {
    items.push({
      key: "TRUST_PROXY",
      severity: "fail",
      message: "Invalid value. Use x-forwarded-for or x-real-ip.",
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
