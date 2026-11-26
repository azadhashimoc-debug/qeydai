import { getSiteUrl } from "@/lib/http/site-url";
import {
  buildDeletionConfirmationCode,
  verifyMetaSignedRequest,
} from "@/lib/legal/meta-data-deletion";

const noStore = { "cache-control": "no-store" } as const;

function resolveMetaAppSecret(env: NodeJS.ProcessEnv = process.env): string {
  return (env.FACEBOOK_APP_SECRET ?? env.QEYDAI_META_APP_SECRET ?? "").trim();
}

async function extractSignedRequest(req: Request): Promise<string | null> {
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    return typeof body?.signed_request === "string" ? body.signed_request : null;
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData().catch(() => null);
    const val = form?.get("signed_request");
    return typeof val === "string" ? val : null;
  }
  const raw = await req.text().catch(() => "");
  const params = new URLSearchParams(raw);
  return params.get("signed_request");
}

/**
 * Meta Data Deletion Callback endpoint.
 * Specification: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export async function POST(req: Request) {
  const secret = resolveMetaAppSecret();
  if (!secret) {
    return Response.json(
      { ok: false, error: "meta_data_deletion_not_configured" },
      { status: 503, headers: noStore },
    );
  }

  const signedRequest = await extractSignedRequest(req);
  if (!signedRequest) {
    return Response.json(
      { ok: false, error: "missing_signed_request" },
      { status: 400, headers: noStore },
    );
  }

  const payload = verifyMetaSignedRequest(signedRequest, secret);
  if (!payload || !payload.user_id) {
    return Response.json(
      { ok: false, error: "invalid_signed_request" },
      { status: 400, headers: noStore },
    );
  }

  const confirmationCode = buildDeletionConfirmationCode(payload.user_id);
  const statusUrl = `${getSiteUrl()}/az/legal/data-deletion?code=${encodeURIComponent(confirmationCode)}`;

  return Response.json(
    {
      url: statusUrl,
      confirmation_code: confirmationCode,
    },
    { status: 200, headers: noStore },
  );
}
