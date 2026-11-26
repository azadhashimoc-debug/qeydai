import { randomUUID } from "node:crypto";
import { readAnalyticsSummary } from "../analytics/summary";
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  MESSAGE_DIRECTIONS,
  MESSAGE_SENDERS,
  normalizeAzPhone,
  type Enrollment,
  type EnrollmentStore,
  type LeadSource,
  type LeadStage,
  type MessageDirection,
  type MessageSender,
} from "../enrollment/enrollment";
import { readLimitedUtf8 } from "../http/read-body";
import { clientKey, noStoreHeaders, sameOrigin } from "../http/same-origin";
import { createRateLimiter } from "../rate-limit";
import { parseInstant, validateName } from "../validation";
import {
  adminKeyFingerprint,
  authenticateAdminKey,
  buildPanelCookieHeader,
  clearPanelCookieHeader,
  createPanelSessionToken,
  DEFAULT_PANEL_TTL_MS,
  getPanelAuthConfig,
  isPanelJtiRevoked,
  PANEL_COOKIE_NAME,
  readCookieValue,
  revokePanelJti,
  verifyAnyPanelToken,
} from "./panel-auth";

const MAX_AUTH_BODY_BYTES = 2048;
const MAX_SESSION_BODY_BYTES = 2048;
const MAX_CRM_BODY_BYTES = 16384;
const MAX_CAPACITY = 1000;
const MAX_NOTE_CHARS = 2000;
const MAX_MESSAGE_CHARS = 4000;
const MAX_ID_CHARS = 128;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const FORBIDDEN_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export type PanelAuthConfig = ReturnType<typeof getPanelAuthConfig>;

export type PanelApiOptions = {
  store: EnrollmentStore;
  getAuthConfig?: () => PanelAuthConfig;
  analyticsPath?: string;
  now?: () => Date;
  authRateMax?: number;
  authMaxKeys?: number;
  apiRateMax?: number;
};

const isLeadSource = (v: unknown): v is LeadSource =>
  typeof v === "string" && (LEAD_SOURCES as readonly string[]).includes(v);
const isLeadStage = (v: unknown): v is LeadStage =>
  typeof v === "string" && (LEAD_STAGES as readonly string[]).includes(v);
const isMessageDirection = (v: unknown): v is MessageDirection =>
  typeof v === "string" && (MESSAGE_DIRECTIONS as readonly string[]).includes(v);
const isMessageSender = (v: unknown): v is MessageSender =>
  typeof v === "string" && (MESSAGE_SENDERS as readonly string[]).includes(v);

const json = (status: number, body: unknown, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: headers ? { ...noStoreHeaders, ...headers } : { ...noStoreHeaders },
  });

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  json(status, { ok: false, error, ...extra });

type BodyResult = { ok: true; value: Record<string, unknown> } | { ok: false; response: Response };

async function readJsonObject(req: Request, maxBytes: number): Promise<BodyResult> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { ok: false, response: fail(415, "unsupported_media_type") };
  }
  const text = await readLimitedUtf8(req, maxBytes);
  if (text === null) return { ok: false, response: fail(413, "payload_too_large") };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, response: fail(400, "invalid_json") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, response: fail(400, "invalid_json") };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}

export function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto === "https") return true;
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function createPanelApi({
  store,
  getAuthConfig = () => getPanelAuthConfig(),
  analyticsPath,
  now = () => new Date(),
  authRateMax = 30,
  authMaxKeys = 10_000,
  apiRateMax = 600,
}: PanelApiOptions) {
  const authLimiter = createRateLimiter({
    max: authRateMax,
    windowMs: 60_000,
    maxKeys: authMaxKeys,
    evictOnFull: true,
    now: () => now().getTime(),
  });
  const apiLimiter = createRateLimiter({ max: apiRateMax, windowMs: 60_000, now: () => now().getTime() });

  async function requirePanelSession(
    req: Request,
  ): Promise<{ ok: true; tenantId: string; memberId: string } | { ok: false; response: Response }> {
    const token = readCookieValue(req.headers.get("cookie"), PANEL_COOKIE_NAME);
    const config = getAuthConfig();
    if (!token || (!config.accountSecret && (!config.secret || config.allowedTenants.size === 0))) {
      return { ok: false, response: fail(401, "unauthorized") };
    }
    const nowMs = now().getTime();
    const payload = verifyAnyPanelToken(token, config, nowMs);
    if (!payload || (await isPanelJtiRevoked(payload.jti, nowMs))) {
      return { ok: false, response: fail(401, "unauthorized") };
    }
    return { ok: true, tenantId: payload.tenantId, memberId: payload.memberId };
  }

  async function runAuthenticated(req: Request, fn: (tenantId: string) => Promise<Response>): Promise<Response> {
    const auth = await requirePanelSession(req);
    if (!auth.ok) return auth.response;
    if (auth.memberId) {
      const storeWithMembers = store as EnrollmentStore & {
        requireSalesMember?: (tenantId: string, memberId: string | null) => Promise<{ memberId: string; role: string } | null>;
      };
      const found =
        typeof storeWithMembers.requireSalesMember === "function"
          ? await storeWithMembers.requireSalesMember(auth.tenantId, auth.memberId)
          : null;
      if (!found || found.role === "operator") {
        return fail(403, "forbidden");
      }
    }
    if (!apiLimiter.allow(auth.tenantId)) return fail(429, "rate_limited");
    try {
      return await fn(auth.tenantId);
    } catch (err) {
      console.error("panel-api error:", err instanceof Error ? err.message : "unknown");
      return fail(500, "server_error");
    }
  }

  return {
    authGet: async (req: Request): Promise<Response> => {
      const auth = await requirePanelSession(req);
      if (!auth.ok) return auth.response;
      return json(200, { ok: true, tenantId: auth.tenantId });
    },

    authPost: async (req: Request): Promise<Response> => {
      if (!sameOrigin(req)) return fail(403, "forbidden");
      if (!authLimiter.allow(clientKey(req))) return fail(429, "rate_limited");

      const body = await readJsonObject(req, MAX_AUTH_BODY_BYTES);
      if (!body.ok) return body.response;

      const rawKey = body.value.key;
      if (typeof rawKey !== "string") return fail(401, "unauthorized");

      const config = getAuthConfig();
      if (!config.secret) return fail(503, "unavailable");
      const tenantId = authenticateAdminKey(rawKey, config.adminKeys);
      if (!tenantId) return fail(401, "unauthorized");

      const token = createPanelSessionToken(
        tenantId,
        config.secret,
        now().getTime(),
        DEFAULT_PANEL_TTL_MS,
        adminKeyFingerprint(rawKey),
      );
      const cookie = buildPanelCookieHeader(token, isSecureRequest(req), DEFAULT_PANEL_TTL_MS / 1000);
      return json(200, { ok: true, tenantId }, { "set-cookie": cookie });
    },

    authDelete: async (req: Request): Promise<Response> => {
      if (!sameOrigin(req)) return fail(403, "forbidden");
      const token = readCookieValue(req.headers.get("cookie"), PANEL_COOKIE_NAME);
      if (token) {
        const config = getAuthConfig();
        const nowMs = now().getTime();
        const payload = verifyAnyPanelToken(token, config, nowMs);
        if (payload) await revokePanelJti(payload.jti, payload.exp, nowMs);
      }
      const cookie = clearPanelCookieHeader(isSecureRequest(req));
      return json(200, { ok: true }, { "set-cookie": cookie });
    },

    overview: (req: Request): Promise<Response> =>
      runAuthenticated(req, async (tenantId) => {
        const [summaries, leads, messages, analytics] = await Promise.all([
          store.listSessionsWithCounts(tenantId),
          store.listLeads(tenantId),
          store.listMessages(tenantId),
          readAnalyticsSummary(analyticsPath),
        ]);

        const leadsByStage: Record<LeadStage, number> = {
          new: 0,
          contacted: 0,
          trial_booked: 0,
          paid: 0,
          lost: 0,
        };
        for (const lead of leads) {
          if (lead.stage in leadsByStage) leadsByStage[lead.stage] += 1;
        }

        const sessions = summaries.map(({ session, taken, seatsLeft }) => ({
          id: session.id,
          courseId: session.courseId,
          startsAt: session.startsAt,
          capacity: session.capacity,
          taken,
          seatsLeft,
        }));
        const totalEnrollments = summaries.reduce((sum, s) => sum + s.taken, 0);

        return json(200, {
          ok: true,
          tenantId,
          sessions,
          leadsByStage,
          totalLeads: leads.length,
          totalEnrollments,
          totalMessages: messages.length,
          analytics,
        });
      }),

    listSessions: (req: Request): Promise<Response> =>
      runAuthenticated(req, async (tenantId) => {
        const [summaries, enrollments] = await Promise.all([
          store.listSessionsWithCounts(tenantId),
          store.listEnrollments(tenantId),
        ]);

        const bySession = new Map<string, Enrollment[]>();
        for (const enrollment of enrollments) {
          let list = bySession.get(enrollment.sessionId);
          if (!list) {
            list = [];
            bySession.set(enrollment.sessionId, list);
          }
          list.push(enrollment);
        }

        return json(200, {
          ok: true,
          sessions: summaries.map(({ session, taken, seatsLeft }) => ({
            id: session.id,
            courseId: session.courseId,
            startsAt: session.startsAt,
            capacity: session.capacity,
            taken,
            seatsLeft,
            enrollments: (bySession.get(session.id) ?? []).map((e) => ({
              id: e.id,
              sessionId: e.sessionId,
              name: e.name,
              phone: e.phone,
              createdAt: e.createdAt,
            })),
          })),
        });
      }),

    createSession: async (req: Request): Promise<Response> => {
      if (!sameOrigin(req)) return fail(403, "forbidden");
      return runAuthenticated(req, async (tenantId) => {
        const body = await readJsonObject(req, MAX_SESSION_BODY_BYTES);
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

        const startsAt = new Date(t).toISOString();
        const session = { id: b.id, tenantId, courseId: b.courseId, startsAt, capacity: b.capacity };
        if ((await store.createSession(session)) === "exists") return fail(409, "session_exists");

        return json(201, {
          ok: true,
          session: {
            id: session.id,
            courseId: session.courseId,
            startsAt: session.startsAt,
            capacity: session.capacity,
            taken: 0,
            seatsLeft: session.capacity,
            enrollments: [],
          },
        });
      });
    },

    listLeads: (req: Request): Promise<Response> =>
      runAuthenticated(req, async (tenantId) => {
        const { searchParams } = new URL(req.url);
        const stageParam = searchParams.get("stage");
        const sourceParam = searchParams.get("source");
        const qParam = searchParams.get("q");

        let stageFilter: LeadStage | null = null;
        if (stageParam !== null && stageParam !== "") {
          if (!isLeadStage(stageParam)) return fail(422, "invalid_input", { field: "stage" });
          stageFilter = stageParam;
        }

        let sourceFilter: LeadSource | null = null;
        if (sourceParam !== null && sourceParam !== "") {
          if (!isLeadSource(sourceParam)) return fail(422, "invalid_input", { field: "source" });
          sourceFilter = sourceParam;
        }

        const qNorm = qParam?.trim().toLowerCase() ?? "";
        const leads = await store.listLeads(tenantId);
        const filtered = leads.filter((lead) => {
          if (stageFilter && lead.stage !== stageFilter) return false;
          if (sourceFilter && lead.source !== sourceFilter) return false;
          if (qNorm) {
            const match =
              lead.name.toLowerCase().includes(qNorm) ||
              lead.phone.toLowerCase().includes(qNorm) ||
              lead.note.toLowerCase().includes(qNorm);
            if (!match) return false;
          }
          return true;
        });

        return json(200, { ok: true, leads: filtered });
      }),

    createLead: async (req: Request): Promise<Response> => {
      if (!sameOrigin(req)) return fail(403, "forbidden");
      return runAuthenticated(req, async (tenantId) => {
        const body = await readJsonObject(req, MAX_CRM_BODY_BYTES);
        if (!body.ok) return body.response;
        const b = body.value;
        const invalid = (field: string) => fail(422, "invalid_input", { field });

        const name = validateName(b.name);
        if (!name) return invalid("name");

        const phone = typeof b.phone === "string" ? normalizeAzPhone(b.phone) : null;
        if (!phone) return invalid("phone");

        let source: LeadSource = "manual";
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
          tenantId,
          name,
          phone,
          source,
          stage,
          note,
          nowIso: now().toISOString(),
        });

        return json(201, { ok: true, lead });
      });
    },

    updateLead: async (req: Request, id: string): Promise<Response> => {
      if (!sameOrigin(req)) return fail(403, "forbidden");
      return runAuthenticated(req, async (tenantId) => {
        const leadId = typeof id === "string" ? id.trim() : "";
        if (!leadId || leadId.length > MAX_ID_CHARS) return fail(422, "invalid_input", { field: "id" });

        const body = await readJsonObject(req, MAX_CRM_BODY_BYTES);
        if (!body.ok) return body.response;
        const b = body.value;

        const hasStage = b.stage !== undefined;
        const hasNote = b.note !== undefined;
        if (!hasStage && !hasNote) return fail(422, "invalid_input");

        let stage: LeadStage | undefined;
        if (hasStage) {
          if (!isLeadStage(b.stage)) return fail(422, "invalid_input", { field: "stage" });
          stage = b.stage;
        }

        let note: string | undefined;
        if (hasNote) {
          if (typeof b.note !== "string" || FORBIDDEN_CONTROL_RE.test(b.note)) {
            return fail(422, "invalid_input", { field: "note" });
          }
          const trimmed = b.note.trim();
          if (trimmed.length > MAX_NOTE_CHARS) return fail(422, "invalid_input", { field: "note" });
          note = trimmed;
        }

        const lead = await store.updateLead(tenantId, leadId, {
          ...(hasStage ? { stage } : {}),
          ...(hasNote ? { note } : {}),
          updatedAt: now().toISOString(),
        });
        if (!lead) return fail(404, "not_found");

        return json(200, { ok: true, lead });
      });
    },

    listMessages: (req: Request): Promise<Response> =>
      runAuthenticated(req, async (tenantId) => {
        const leadIdParam = new URL(req.url).searchParams.get("leadId");
        if (leadIdParam !== null && leadIdParam !== "") {
          const lead = await store.getLead(tenantId, leadIdParam);
          if (!lead) return fail(404, "not_found");
          const messages = await store.listMessages(tenantId, leadIdParam);
          return json(200, { ok: true, messages });
        }

        const messages = await store.listMessages(tenantId);
        return json(200, { ok: true, messages });
      }),

    createMessage: async (req: Request): Promise<Response> => {
      if (!sameOrigin(req)) return fail(403, "forbidden");
      return runAuthenticated(req, async (tenantId) => {
        const body = await readJsonObject(req, MAX_CRM_BODY_BYTES);
        if (!body.ok) return body.response;
        const b = body.value;
        const invalid = (field: string) => fail(422, "invalid_input", { field });

        const leadId = typeof b.leadId === "string" ? b.leadId.trim() : "";
        if (!leadId || leadId.length > MAX_ID_CHARS) return invalid("leadId");

        if (typeof b.body !== "string" || FORBIDDEN_CONTROL_RE.test(b.body)) return invalid("body");
        const trimmedBody = b.body.trim();
        if (!trimmedBody || trimmedBody.length > MAX_MESSAGE_CHARS) return invalid("body");

        let sender: MessageSender = "staff";
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

        const lead = await store.getLead(tenantId, leadId);
        if (!lead) return fail(404, "not_found");

        const nowIso = now().toISOString();
        const message = await store.addMessage({
          id: randomUUID(),
          tenantId,
          leadId,
          channel: channelInput ?? lead.source,
          direction,
          sender,
          body: trimmedBody,
          createdAt: nowIso,
        });
        if (!message) return fail(404, "not_found");

        await store.updateLead(tenantId, leadId, { updatedAt: nowIso });
        return json(201, { ok: true, message });
      });
    },
  };
}
