import { isSecureRequest } from "@/lib/api/panel-api";
import {
  DEFAULT_PANEL_TTL_MS, buildPanelCookieHeader, createPanelSessionToken, getPanelAuthConfig, isPanelJtiRevoked,
  verifyPanelSessionToken,
} from "@/lib/api/panel-auth";
import type { SignedIn } from "./accounts";

/**
 * Builds the panel session cookie for a signed-in account. Returns null (fail closed) when the signing secret is
 * missing or the revocation backend is unreachable, exactly like the admin-key login.
 */
export async function issueSessionCookie(req: Request, signedIn: SignedIn): Promise<string | null> {
  const secret = getPanelAuthConfig().secret;
  if (!secret) return null;
  const now = Date.now();
  const token = createPanelSessionToken(
    signedIn.tenantId, secret, now, DEFAULT_PANEL_TTL_MS, undefined, signedIn.memberId, signedIn.accountId,
  );
  const issued = verifyPanelSessionToken(token, secret, new Map(), now, { allowSocial: true });
  if (!issued) return null;
  try {
    await isPanelJtiRevoked(issued.jti, now, issued.tenantId);
  } catch {
    return null;
  }
  return buildPanelCookieHeader(token, isSecureRequest(req), DEFAULT_PANEL_TTL_MS / 1000);
}
