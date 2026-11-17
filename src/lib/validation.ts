const hasControlChar = (s: string) => [...s].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);

/** Returns the trimmed name, or null when missing, not a string, too long, or containing control characters. */
export function validateName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const n = raw.trim();
  if (!n || n.length > 100 || hasControlChar(n)) return null;
  return n;
}

/** ISO-8601 instant with an explicit offset (Z or +hh:mm). Returns epoch ms, or null if invalid/ambiguous. */
export function parseInstant(raw: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(raw)) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : t;
}
