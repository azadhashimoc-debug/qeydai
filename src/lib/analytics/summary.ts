import { open, stat } from "node:fs/promises";
import path from "node:path";

const MAX_READ_BYTES = 10 * 1024 * 1024; // 10 MiB cap to prevent OOM on oversized logs

export type FunnelSummary = {
  totalEvents: number;
  pageViews: number;
  ctaClicks: number;
  leadFormStarted: number;
  leadFormSubmitted: number;
  leadFormFailed: number;
  byLocale: { az: number; en: number };
  byCtaLocation: Record<string, number>;
  byUtmSource: Record<string, number>;
  byExperiment: Record<string, { views: number; ctaClicks: number; leads: number }>;
};

export function createEmptyFunnelSummary(): FunnelSummary {
  return {
    totalEvents: 0,
    pageViews: 0,
    ctaClicks: 0,
    leadFormStarted: 0,
    leadFormSubmitted: 0,
    leadFormFailed: 0,
    byLocale: { az: 0, en: 0 },
    byCtaLocation: {},
    byUtmSource: {},
    byExperiment: {},
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function incCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function incExperiment(
  map: Map<string, { views: number; ctaClicks: number; leads: number }>,
  exp: string,
  field: "views" | "ctaClicks" | "leads",
): void {
  let entry = map.get(exp);
  if (!entry) {
    entry = { views: 0, ctaClicks: 0, leads: 0 };
    map.set(exp, entry);
  }
  entry[field] += 1;
}

export function summarizeAnalyticsLines(lines: Iterable<string>): FunnelSummary {
  const summary = createEmptyFunnelSummary();
  const ctaLocationMap = new Map<string, number>();
  const utmSourceMap = new Map<string, number>();
  const experimentMap = new Map<string, { views: number; ctaClicks: number; leads: number }>();

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (!isRecord(parsed) || typeof parsed.event !== "string" || !isRecord(parsed.props)) {
      continue;
    }

    const props = parsed.props;
    summary.totalEvents += 1;

    if (props.locale === "az") summary.byLocale.az += 1;
    else if (props.locale === "en") summary.byLocale.en += 1;

    switch (parsed.event) {
      case "page_viewed": {
        summary.pageViews += 1;
        if (typeof props.utm_source === "string" && props.utm_source.length > 0) {
          incCount(utmSourceMap, props.utm_source);
        }
        if (typeof props.exp === "string" && props.exp.length > 0) {
          incExperiment(experimentMap, props.exp, "views");
        }
        break;
      }
      case "cta_clicked": {
        summary.ctaClicks += 1;
        if (typeof props.location === "string" && props.location.length > 0) {
          incCount(ctaLocationMap, props.location);
        }
        if (typeof props.exp === "string" && props.exp.length > 0) {
          incExperiment(experimentMap, props.exp, "ctaClicks");
        }
        break;
      }
      case "lead_form_started": {
        summary.leadFormStarted += 1;
        break;
      }
      case "lead_form_submitted": {
        summary.leadFormSubmitted += 1;
        if (typeof props.exp === "string" && props.exp.length > 0) {
          incExperiment(experimentMap, props.exp, "leads");
        }
        break;
      }
      case "lead_form_failed": {
        summary.leadFormFailed += 1;
        break;
      }
      default:
        break;
    }
  }

  summary.byCtaLocation = Object.fromEntries(ctaLocationMap);
  summary.byUtmSource = Object.fromEntries(utmSourceMap);
  summary.byExperiment = Object.fromEntries(experimentMap);
  return summary;
}

async function readBoundedText(filePath: string): Promise<string | null> {
  let fileStat: Awaited<ReturnType<typeof stat>>;
  try {
    fileStat = await stat(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }

  if (!fileStat.isFile() || fileStat.size === 0) return "";

  const truncated = fileStat.size > MAX_READ_BYTES;
  const start = truncated ? fileStat.size - MAX_READ_BYTES : 0;
  const length = fileStat.size - start;

  const handle = await open(filePath, "r");
  try {
    const buf = Buffer.allocUnsafe(length);
    let offset = 0;
    while (offset < length) {
      const { bytesRead } = await handle.read(buf, offset, length - offset, start + offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const text = buf.subarray(0, offset).toString("utf8");
    if (!truncated) return text;
    // Drop the likely-partial first line when reading from a mid-file offset.
    const firstNewline = text.indexOf("\n");
    return firstNewline === -1 ? "" : text.slice(firstNewline + 1);
  } finally {
    await handle.close();
  }
}

export async function readAnalyticsSummary(
  filePath: string = process.env.ANALYTICS_FILE ?? path.join(process.cwd(), "data", "analytics.jsonl"),
): Promise<FunnelSummary> {
  const content = await readBoundedText(filePath);
  if (!content) return createEmptyFunnelSummary();
  return summarizeAnalyticsLines(content.split(/\r?\n/));
}
