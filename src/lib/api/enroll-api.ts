import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  EnrollmentService,
  LEAD_SOURCES,
  LEAD_STAGES,
  MESSAGE_DIRECTIONS,
  MESSAGE_SENDERS,
  normalizeAzPhone,
  type EnrollmentStore,
  type LeadSource,
  type LeadStage,
  type MessageDirection,
  type MessageSender,
} from "../enrollment/enrollment";
import { readLimitedUtf8 } from "../http/read-body";
import { createRateLimiter } from "../rate-limit";
import { parseInstant, validateName } from "../validation";

const MAX_BODY_BYTES = 2048;
const MAX_CRM_BODY_BYTES = 16384;
const MAX_CAPACITY = 1000;
const MAX_NOTE_CHARS = 2000;
const MAX_MESSAGE_CHARS = 4000;
const MAX_ID_CHARS = 128;
/** Session and course ids: URL/log safe, no spaces or control characters. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const FORBIDDEN_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const isLeadSource = (v: unknown): v is LeadSource =>
  typeof v === "string" && (LEAD_SOURCES as readonly string[]).includes(v);
const isLeadStage = (v: unknown): v is LeadStage =>
  typeof v === "string" && (LEAD_STAGES as readonly string[]).includes(v);
const isMessageDirection = (v: unknown): v is MessageDirection =>
  typeof v === "string" && (MESSAGE_DIRECTIONS as readonly string[]).includes(v);
const isMessageSender = (v: unknown): v is MessageSender =>
  typeof v === "string" && (MESSAGE_SENDERS as readonly string[]).includes(v);

type Options = {
  store: EnrollmentStore;
  /** Map of API key -> tenant id. The tenant is always derived from the key, never from the request body. */
  keys: Record<string, string>;
  /** Separate admin keys (key -> tenant) that may only create sessions. Empty means session creation is disabled. */
  adminKeys?: Record<string, string>;
  now?: () => Date;
  /** Requests per minute per key. */
  rateMax?: number;
};

const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", vary: "authorization" } });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => json(status, { ok: false, error, ...extra });

const sha = (s: string) => createHash("sha256").update(s).digest();

type KeyEntry = { hash: Buffer; tenant: string };
const toEntries = (keys: Record<string, string>): KeyEntry[] =>
  Object.entries(keys).map(([k, tenant]) => ({ hash: sha(k), tenant }));

type Body = { ok: true; value: Record<string, unknown> } | { ok: false; response: Response };

/** Content-type check, byte-limited read and JSON parse shared by every write endpoint. */
async function readJsonBody(
  req: Request,
  maxBytes = MAX_BODY_BYTES,
  opts: { requireObject?: boolean } = {},
): Promise<Body> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { ok: false, response: fail(415, "unsupported_media_type") };
  }
  const text = await readLimitedUtf8(req, maxBytes);
  if (text === null) return { ok: false, response: fail(413, "payload_too_large") };
  try {
    const body: unknown = JSON.parse(text);
    if (opts.requireObject && (typeof body !== "object" || body === null || Array.isArray(body))) {
      return { ok: false, response: fail(400, "invalid_json") };
    }
    return { ok: true, value: (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown> };
  } catch {
    return { ok: false, response: fail(400, "invalid_json") };
  }
}

/** Machine-to-machine API for n8n. Bearer-key auth, tenant from key, deterministic enrollment rules. */
export function createEnrollApi({ store, keys, adminKeys = {}, now = () => new Date(), rateMax = 120 }: Options) {
  const service = new EnrollmentService(store, now);
  const limiter = createRateLimiter({ max: rateMax, windowMs: 60_000, now: () => now().getTime() });
  const enrollEntries = toEntries(keys);
  const adminEntries = toEntries(adminKeys);

  /** Returns the tenant for a valid Bearer key in `entries`, else null. Compares against every key (no early exit). */
  function authenticate(req: Request, entries: KeyEntry[]): { tenant: string; bucket: string } | null {
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
    if (!m) return null;
    const given = sha(m[1].trim());
    let found: string | null = null;
    for (const e of entries) if (timingSafeEqual(given, e.hash)) found = e.tenant;
    return found ? { tenant: found, bucket: given.toString("hex") } : null;
  }

  async function guarded(req: Request, entries: KeyEntry[], run: (tenant: string) => Promise<Response>, onMiss?: () => Response) {
    const auth = authenticate(req, entries);
    if (!auth) return onMiss?.() ?? fail(401, "unauthorized");
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
      guarded(req, enrollEntries, async (tenant) => {
        const available = await service.listSessionsWithAvailability(tenant);
        const out = available.map(({ session: s, seatsLeft }) => ({
          id: s.id,
          courseId: s.courseId,
          startsAt: s.startsAt,
          seatsLeft,
        }));
        return json(200, { ok: true, sessions: out });
      }),

    enroll: (req: Request) =>
      guarded(req, enrollEntries, async (tenant) => {
        const body = await readJsonBody(req);
        if (!body.ok) return body.response;
        const b = body.value;
        if (typeof b.sessionId !== "string" || !b.sessionId) return fail(422, "invalid_input");

        const r = await service.register(tenant, { sessionId: b.sessionId, name: b.name as string, phone: b.phone as string });
        if (r.ok) return json(201, { ok: true, enrollmentId: r.enrollment.id });
        const status = { invalid_input: 422, unknown_session: 404, session_started: 409, full: 409, duplicate: 409 }[r.reason];
        return fail(status, r.reason);
      }),

    /** Admin-only: create a session for the admin key's tenant. Never overwrites an existing session. */
    createSession: (req: Request) =>
      guarded(
        req,
        adminEntries,
        async (tenant) => {
          const body = await readJsonBody(req);
          if (!body.ok) return body.response;
          const b = body.value;
          const invalid = (field: string) => fail(422, "invalid_input", { field });

          if (typeof b.id !== "string" || !ID_PATTERN.test(b.id)) return invalid("id");
          if (typeof b.courseId !== "string" || !ID_PATTERN.test(b.courseId)) return invalid("courseId");
          const t = typeof b.startsAt === "string" ? parseInstant(b.startsAt) : null;
          if (t === null || t <= now().getTime()) return invalid("startsAt");
          if (typeof b.capacity !== "number" || !Number.isInteger(b.capacity) || b.capacity < 1 || b.capacity > MAX_CAPACITY) {
            return invalid("capacity");
          }

          const session = { id: b.id, tenantId: tenant, courseId: b.courseId, startsAt: new Date(t).toISOString(), capacity: b.capacity };
          if ((await store.createSession(session)) === "exists") return fail(409, "session_exists");
          return json(201, { ok: true, session: { id: session.id, courseId: session.courseId, startsAt: session.startsAt, capacity: session.capacity } });
        },
        // A valid enrollment key is authenticated but lacks the admin scope.
        () => (authenticate(req, enrollEntries) ? fail(403, "forbidden") : fail(401, "unauthorized")),
      ),

    upsertLead: (req: Request) =>
      guarded(req, enrollEntries, async (tenant) => {
        const body = await readJsonBody(req, MAX_CRM_BODY_BYTES, { requireObject: true });
        if (!body.ok) return body.response;
        const b = body.value;
        const invalid = (field: string) => fail(422, "invalid_input", { field });

        const name = validateName(b.name);
        if (!name) return invalid("name");

        const phone = typeof b.phone === "string" ? normalizeAzPhone(b.phone) : null;
        if (!phone) return invalid("phone");

        let source: LeadSource = "telegram";
        if (b.source !== undefined) {
          if (!isLeadSource(b.source)) return invalid("source");
          source = b.source;
        }

        let stage: LeadStage | undefined;
        if (b.stage !== undefined) {
          if (!isLeadStage(b.stage)) return invalid("stage");
          stage = b.stage;
        }

        let note: string | undefined;
        if (b.note !== undefined) {
          if (typeof b.note !== "string" || FORBIDDEN_CONTROL_RE.test(b.note)) return invalid("note");
          const trimmed = b.note.trim();
          if (trimmed.length > MAX_NOTE_CHARS) return invalid("note");
          note = trimmed;
        }

        const lead = await store.upsertLead({
          id: randomUUID(),
          tenantId: tenant,
          name,
          phone,
          source,
          stage,
          note,
          nowIso: now().toISOString(),
        });
        return json(201, { ok: true, leadId: lead.id, stage: lead.stage });
      }),

    addMessage: (req: Request) =>
      guarded(req, enrollEntries, async (tenant) => {
        const body = await readJsonBody(req, MAX_CRM_BODY_BYTES, { requireObject: true });
        if (!body.ok) return body.response;
        const b = body.value;
        const invalid = (field: string) => fail(422, "invalid_input", { field });

        const leadId = typeof b.leadId === "string" ? b.leadId.trim() : "";
        if (!leadId || leadId.length > MAX_ID_CHARS) return invalid("leadId");

        if (typeof b.body !== "string" || FORBIDDEN_CONTROL_RE.test(b.body)) return invalid("body");
        const trimmedBody = b.body.trim();
        if (!trimmedBody || trimmedBody.length > MAX_MESSAGE_CHARS) return invalid("body");

        let sender: MessageSender = "student";
        if (b.sender !== undefined) {
          if (!isMessageSender(b.sender)) return invalid("sender");
          sender = b.sender;
        }

        const expectedDirection: MessageDirection = sender === "student" ? "in" : "out";
        let direction: MessageDirection = expectedDirection;
        if (b.direction !== undefined) {
          if (!isMessageDirection(b.direction) || b.direction !== expectedDirection) return invalid("direction");
          direction = b.direction;
        }

        let channelInput: LeadSource | undefined;
        if (b.channel !== undefined) {
          if (!isLeadSource(b.channel)) return invalid("channel");
          channelInput = b.channel;
        }

        const lead = await store.getLead(tenant, leadId);
        if (!lead) return fail(404, "not_found");

        const nowIso = now().toISOString();
        const message = await store.addMessage({
          id: randomUUID(),
          tenantId: tenant,
          leadId,
          channel: channelInput ?? lead.source,
          direction,
          sender,
          body: trimmedBody,
          createdAt: nowIso,
        });
        if (!message) return fail(404, "not_found");

        await store.updateLead(tenant, leadId, { updatedAt: nowIso });
        return json(201, { ok: true, messageId: message.id });
      }),
  };
}
