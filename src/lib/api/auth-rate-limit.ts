import type { Pool } from "pg";
import { clientKey } from "../http/same-origin";
import { allowDistributedLimit, type DistributedLimit } from "./pg-rate-limit";

export type AuthLimit = DistributedLimit;

export const REGISTER_PER_IP: AuthLimit = { name: "register-ip", max: 20, windowMs: 10 * 60_000 };
export const LOGIN_PER_IP: AuthLimit = { name: "login-ip", max: 30, windowMs: 60_000 };
export const LOGIN_PER_EMAIL: AuthLimit = { name: "login-email", max: 10, windowMs: 15 * 60_000 };
export const FORGOT_PASSWORD_PER_IP: AuthLimit = { name: "forgot-ip", max: 15, windowMs: 15 * 60_000 };
export const FORGOT_PASSWORD_PER_EMAIL: AuthLimit = { name: "forgot-email", max: 5, windowMs: 15 * 60_000 };
export const RESEND_VERIFY_PER_IP: AuthLimit = { name: "resend-verify-ip", max: 15, windowMs: 15 * 60_000 };
export const RESEND_VERIFY_PER_EMAIL: AuthLimit = { name: "resend-verify-email", max: 5, windowMs: 15 * 60_000 };
export const RESET_PASSWORD_PER_IP: AuthLimit = { name: "reset-pw-ip", max: 20, windowMs: 15 * 60_000 };

/**
 * Client IP for auth limits. Same trust rules as every other limiter: proxy headers count only
 * on Vercel or when TRUST_PROXY allows them, so a spoofed header cannot mint fresh buckets.
 */
export function clientIp(req: Request): string {
  return clientKey(req);
}

/**
 * Shared fixed-window limit stored in PostgreSQL so every serverless instance sees the same count.
 * Falls back to a per-process limiter only if the counter table is unavailable (e.g. migration 0007
 * not yet applied), and logs that once so the gap is visible.
 */
export async function allowAuthAttempt(pool: Pool, limit: AuthLimit, subject: string): Promise<boolean> {
  return allowDistributedLimit(limit, subject, pool);
}
