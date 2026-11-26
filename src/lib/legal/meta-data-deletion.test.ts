import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildDeletionConfirmationCode,
  verifyMetaSignedRequest,
} from "./meta-data-deletion";
import { POST } from "@/app/api/legal/meta-data-deletion/route";

function signRequest(payload: Record<string, unknown>, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const encodedSig = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedSig}.${encodedPayload}`;
}

describe("Meta Data Deletion Callback", () => {
  const originalFbSecret = process.env.FACEBOOK_APP_SECRET;
  const originalMetaSecret = process.env.QEYDAI_META_APP_SECRET;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalFbSecret === undefined) delete process.env.FACEBOOK_APP_SECRET;
    else process.env.FACEBOOK_APP_SECRET = originalFbSecret;
    if (originalMetaSecret === undefined) delete process.env.QEYDAI_META_APP_SECRET;
    else process.env.QEYDAI_META_APP_SECRET = originalMetaSecret;
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("verifies a valid HMAC-SHA256 signed_request and rejects forged signatures", () => {
    const secret = "meta_test_secret_12345";
    const sr = signRequest({ user_id: "fb_user_42", algorithm: "HMAC-SHA256", issued_at: 1700000000 }, secret);
    expect(verifyMetaSignedRequest(sr, secret)).toEqual({
      user_id: "fb_user_42",
      algorithm: "HMAC-SHA256",
      issued_at: 1700000000,
    });
    expect(verifyMetaSignedRequest(sr, "wrong_secret")).toBeNull();
    expect(verifyMetaSignedRequest("bad.format.extra", secret)).toBeNull();
    expect(buildDeletionConfirmationCode("fb_user_42", 1700000000_000)).toMatch(/^del_[a-f0-9]{16}$/);
  });

  it("returns 503 when Meta app secret is not configured", async () => {
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.QEYDAI_META_APP_SECRET;
    const req = new Request("https://panelim.az/api/legal/meta-data-deletion", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ signed_request: "a.b" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("returns status URL and confirmation_code for a valid signed_request", async () => {
    const secret = "meta_test_secret_12345";
    process.env.FACEBOOK_APP_SECRET = secret;
    process.env.NEXT_PUBLIC_SITE_URL = "https://panelim.az";
    const sr = signRequest({ user_id: "fb_user_99", algorithm: "HMAC-SHA256" }, secret);
    const req = new Request("https://panelim.az/api/legal/meta-data-deletion", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ signed_request: sr }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string; confirmation_code: string };
    expect(body.confirmation_code).toMatch(/^del_[a-f0-9]{16}$/);
    expect(body.url).toBe(`https://panelim.az/az/legal/data-deletion?code=${body.confirmation_code}`);
  });

  it("rejects tampered signed_request with 400", async () => {
    process.env.FACEBOOK_APP_SECRET = "meta_test_secret_12345";
    const sr = signRequest({ user_id: "fb_user_99", algorithm: "HMAC-SHA256" }, "other_secret");
    const req = new Request("https://panelim.az/api/legal/meta-data-deletion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signed_request: sr }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
