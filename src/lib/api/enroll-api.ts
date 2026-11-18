import { createHash, timingSafeEqual } from "node:crypto";
import { EnrollmentService, type EnrollmentStore } from "../enrollment/enrollment";
import { createRateLimiter } from "../rate-limit";

const MAX_BODY_BYTES = 2048;

type Options = {
  store: EnrollmentStore;
  /** Map of API key -> tenant id. The tenant is always derived from the key, never from the request body. */
  keys: Record<string, string>;
  now?: () => Date;
  /** Requests per minute per key. */
  rateMax?: number;
};

const json = (status: number, body: unknown) => Response.json(body, { status });
const fail = (status: number, error: string) => json(status, { ok: false, error });

const sha = (s: string) => createHash("sha256").update(s).digest();

/** Machine-to-machine API for n8n. Bearer-key auth, tenant from key, deterministic enrollment rules. */
export function createEnrollApi({ store, keys, now = () => new Date(), rateMax = 120 }: Options) {
  const service = new EnrollmentService(store, now);
  const limiter = createRateLimiter({ max: rateMax, windowMs: 60_000 });
  const entries = Object.entries(keys).map(([k, tenant]) => ({ hash: sha(k), tenant }));

  /** Returns the tenant for a valid Bearer key, else null. Compares against every key (no early exit). */
  function authenticate(req: Request): { tenant: string; bucket: string } | null {
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
    if (!m) return null;
    const given = sha(m[1].trim());
    let found: string | null = null;
    for (const e of entries) if (timingSafeEqual(given, e.hash)) found = e.tenant;
    return found ? { tenant: found, bucket: given.toString("hex") } : null;
  }

  async function guarded(req: Request, run: (tenant: string) => Promise<Response>) {
    const auth = authenticate(req);
    if (!auth) return fail(401, "unauthorized");
    if (!limiter.allow(auth.bucket)) return fail(429, "rate_limited");
    try {
      return await run(auth.tenant);
    } catch (err) {
      console.error("enroll-api error:", err instanceof Error ? err.message : "unknown");
      return fail(500, "server_error");
    }
  }

  return {
    listSessions: (req: Request) =>
      guarded(req, async (tenant) => {
        const sessions = await service.listSessions(tenant, { onlyAvailable: true });
        const out = [];
        for (const s of sessions) {
          const taken = await store.countBySession(tenant, s.id);
          out.push({ id: s.id, courseId: s.courseId, startsAt: s.startsAt, seatsLeft: s.capacity - taken });
        }
        return json(200, { ok: true, sessions: out });
      }),

    enroll: (req: Request) =>
      guarded(req, async (tenant) => {
        if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
          return fail(415, "unsupported_media_type");
        }
        const declared = Number(req.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail(413, "payload_too_large");
        const text = await req.text();
        if (Buffer.byteLength(text) > MAX_BODY_BYTES) return fail(413, "payload_too_large");

        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          return fail(400, "invalid_json");
        }
        const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
        if (typeof b.sessionId !== "string" || !b.sessionId) return fail(422, "invalid_input");

        const r = await service.register(tenant, { sessionId: b.sessionId, name: b.name as string, phone: b.phone as string });
        if (r.ok) return json(201, { ok: true, enrollmentId: r.enrollment.id });
        const status = { invalid_input: 422, unknown_session: 404, session_started: 409, full: 409, duplicate: 409 }[r.reason];
        return fail(status, r.reason);
      }),
  };
}
