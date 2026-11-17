import { normalizeAzPhone } from "@/lib/enrollment/enrollment";

export type Lead = { name: string; phone: string };

const hasControlChar = (s: string) => [...s].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);

export function validateLead(input: unknown): { ok: true; lead: Lead } | { ok: false } {
  if (typeof input !== "object" || input === null) return { ok: false };
  const { name, phone } = input as Record<string, unknown>;
  if (typeof name !== "string" || typeof phone !== "string") return { ok: false };
  const n = name.trim();
  const p = normalizeAzPhone(phone);
  if (!n || n.length > 100 || hasControlChar(n) || !p) return { ok: false };
  return { ok: true, lead: { name: n, phone: p } };
}
