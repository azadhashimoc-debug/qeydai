import { describe, expect, it, vi } from "vitest";
import {
  adminKeyFingerprint,
  authenticateAdminKey,
  buildPanelCookieHeader,
  clearPanelCookieHeader,
  createPanelSessionToken,
  derivePanelSecret,
  PANEL_COOKIE_NAME,
  readCookieValue,
  verifyPanelSessionToken,
  revokePanelJti,
  isPanelJtiRevoked,
  setPanelJtiStore,
} from "./panel-auth";

const KEY_A = "admin_key_alpha_1234567890abcdef";
const KEY_A_ROTATED = "admin_key_alpha_rotated_9876543210";
const KEY_B = "admin_key_bravo_1234567890abcdef";
const ADMIN_KEYS = {
  [KEY_A]: "tenant_alpha",
  [KEY_B]: "tenant_bravo",
};
const ALLOWED = new Set(["tenant_alpha", "tenant_bravo"]);
const ALLOWED_BY_TENANT = new Map<string, Set<string>>([
  ["tenant_alpha", new Set([adminKeyFingerprint(KEY_A)])],
  ["tenant_bravo", new Set([adminKeyFingerprint(KEY_B)])],
]);

describe("authenticateAdminKey", () => {
  it("returns tenantId for matching keys and null for invalid or empty keys", () => {
    expect(authenticateAdminKey(KEY_A, ADMIN_KEYS)).toBe("tenant_alpha");
    expect(authenticateAdminKey(`  ${KEY_B}  `, ADMIN_KEYS)).toBe("tenant_bravo");
    expect(authenticateAdminKey("wrong_key_1234567890abcdefghij", ADMIN_KEYS)).toBeNull();
    expect(authenticateAdminKey("", ADMIN_KEYS)).toBeNull();
    expect(authenticateAdminKey("   ", ADMIN_KEYS)).toBeNull();
  });

  it("fails closed when adminKeys map is empty", () => {
    expect(authenticateAdminKey(KEY_A, {})).toBeNull();
  });
});

describe("derivePanelSecret", () => {
  it("requires either configured administrator keys or a strong explicit secret", () => {
    expect(derivePanelSecret({})).toBeNull();
    expect(derivePanelSecret({}, "weak")).toBeNull();
    expect(derivePanelSecret({}, "s".repeat(32))).not.toBeNull();
  });

  it("derives deterministic secret independent of key insertion order", () => {
    const s1 = derivePanelSecret({ [KEY_A]: "tenant_alpha", [KEY_B]: "tenant_bravo" });
    const s2 = derivePanelSecret({ [KEY_B]: "tenant_bravo", [KEY_A]: "tenant_alpha" });
    expect(s1).not.toBeNull();
    expect(s2).not.toBeNull();
    expect(s1!.equals(s2!)).toBe(true);
  });

  it("uses explicitSecret when >= 24 non-whitespace chars and ignores weak or blank explicitSecret", () => {
    const derivedOnly = derivePanelSecret(ADMIN_KEYS)!;
    const withWeak = derivePanelSecret(ADMIN_KEYS, "too-short")!;
    const withSpaces = derivePanelSecret(ADMIN_KEYS, " ".repeat(32))!;
    const withStrong = derivePanelSecret(ADMIN_KEYS, "x".repeat(24))!;

    expect(withWeak.equals(derivedOnly)).toBe(true);
    expect(withSpaces.equals(derivedOnly)).toBe(true);
    expect(withStrong.equals(derivedOnly)).toBe(false);
  });
});

describe("createPanelSessionToken & verifyPanelSessionToken", () => {
  const secret = derivePanelSecret(ADMIN_KEYS)!;
  const now = 1_700_000_000_000;

  it("signs and verifies a valid session token with key fingerprint and jti", () => {
    const fpA = adminKeyFingerprint(KEY_A);
    const token = createPanelSessionToken("tenant_alpha", secret, now, 60_000, fpA);
    const verified = verifyPanelSessionToken(token, secret, ALLOWED_BY_TENANT, now + 10_000);
    expect(verified).toMatchObject({ tenantId: "tenant_alpha", exp: now + 60_000 });
    expect(typeof verified?.jti).toBe("string");
    expect(verified?.jti.length).toBeGreaterThanOrEqual(8);
  });

  it("rejects token after same-tenant admin key rotation when verified against key fingerprints", () => {
    const fpOld = adminKeyFingerprint(KEY_A);
    const fpRotated = adminKeyFingerprint(KEY_A_ROTATED);
    expect(fpOld).not.toBe(fpRotated);
    expect(adminKeyFingerprint(`  ${KEY_A}  `)).toBe(fpOld);

    const token = createPanelSessionToken("tenant_alpha", secret, now, 60_000, fpOld);
    const rotatedMap = new Map<string, Set<string>>([
      ["tenant_alpha", new Set([fpRotated])],
      ["tenant_bravo", new Set([adminKeyFingerprint(KEY_B)])],
    ]);
    expect(verifyPanelSessionToken(token, secret, rotatedMap, now + 1000)).toBeNull();

    // Also rejects legacy token without k when Map is enforced
    const legacyToken = createPanelSessionToken("tenant_alpha", secret, now, 60_000);
    expect(verifyPanelSessionToken(legacyToken, secret, ALLOWED_BY_TENANT, now + 1000)).toBeNull();
  });

  it("rejects tampered payload or tampered signature", () => {
    const token = createPanelSessionToken("tenant_alpha", secret, now, 60_000);
    const [payloadB64, sigB64] = token.split(".");

    const forgedPayload = Buffer.from(
      JSON.stringify({ t: "tenant_bravo", iat: now, exp: now + 60_000 }),
      "utf8",
    ).toString("base64url");
    expect(verifyPanelSessionToken(`${forgedPayload}.${sigB64}`, secret, ALLOWED, now + 1000)).toBeNull();

    const flippedSig =
      (sigB64[0] === "A" ? "B" : "A") + sigB64.slice(1);
    expect(verifyPanelSessionToken(`${payloadB64}.${flippedSig}`, secret, ALLOWED, now + 1000)).toBeNull();

    expect(verifyPanelSessionToken("malformed-token", secret, ALLOWED, now)).toBeNull();
    expect(verifyPanelSessionToken(`${payloadB64}.${sigB64}.extra`, secret, ALLOWED, now)).toBeNull();
  });

  it("rejects expired tokens (including exact exp boundary)", () => {
    const token = createPanelSessionToken("tenant_alpha", secret, now, 1_000);
    expect(verifyPanelSessionToken(token, secret, ALLOWED, now + 999)).not.toBeNull();
    expect(verifyPanelSessionToken(token, secret, ALLOWED, now + 1_000)).toBeNull();
    expect(verifyPanelSessionToken(token, secret, ALLOWED, now + 5_000)).toBeNull();
  });

  it("rejects tokens whose tenant has been revoked/removed from allowedTenants", () => {
    const token = createPanelSessionToken("tenant_alpha", secret, now, 60_000);
    const remainingTenants = new Set(["tenant_bravo"]);
    expect(verifyPanelSessionToken(token, secret, remainingTenants, now + 1000)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const otherSecret = derivePanelSecret({ [KEY_A]: "tenant_alpha" }, "different_secret_material_12345")!;
    const token = createPanelSessionToken("tenant_alpha", secret, now, 60_000);
    expect(verifyPanelSessionToken(token, otherSecret, ALLOWED, now + 1000)).toBeNull();
  });
});

describe("cookie header helpers", () => {
  it("builds HttpOnly SameSite=Lax cookie headers with conditional Secure flag", () => {
    expect(buildPanelCookieHeader("abc.def", false, 3600)).toBe(
      `${PANEL_COOKIE_NAME}=abc.def; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`,
    );
    expect(buildPanelCookieHeader("abc.def", true, 3600)).toBe(
      `${PANEL_COOKIE_NAME}=abc.def; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600; Secure`,
    );
    expect(clearPanelCookieHeader(false)).toBe(
      `${PANEL_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
    );
    expect(clearPanelCookieHeader(true)).toBe(
      `${PANEL_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`,
    );
  });

  it("reads target cookie value safely from Cookie header", () => {
    const header = `other=123; ${PANEL_COOKIE_NAME}=payload.sig; theme=dark`;
    expect(readCookieValue(header, PANEL_COOKIE_NAME)).toBe("payload.sig");
    expect(readCookieValue(header, "missing")).toBeNull();
    expect(readCookieValue(null, PANEL_COOKIE_NAME)).toBeNull();
    expect(readCookieValue(`${PANEL_COOKIE_NAME}=%E0%A4%A`, PANEL_COOKIE_NAME)).toBe("%E0%A4%A");
  });
});

describe("production JTI storage fail-closed", () => {
  it("never trusts an in-process revocation map on Vercel", async () => {
    setPanelJtiStore(null);
    vi.stubEnv("VERCEL", "1");
    try {
      await expect(revokePanelJti("test-production-jti", Date.now() + 60_000)).rejects.toThrow(
        "persistent_panel_jti_store_required",
      );
      await expect(isPanelJtiRevoked("test-production-jti")).rejects.toThrow(
        "persistent_panel_jti_store_required",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
