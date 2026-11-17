import { normalizeAzPhone } from "@/lib/enrollment/enrollment";
import { validateName } from "@/lib/validation";

export type Lead = { name: string; phone: string };

export function validateLead(input: unknown): { ok: true; lead: Lead } | { ok: false } {
  if (typeof input !== "object" || input === null) return { ok: false };
  const { name, phone } = input as Record<string, unknown>;
  const n = validateName(name);
  const p = typeof phone === "string" ? normalizeAzPhone(phone) : null;
  return n && p ? { ok: true, lead: { name: n, phone: p } } : { ok: false };
}
