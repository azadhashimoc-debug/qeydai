import { createHash, randomUUID } from "node:crypto";
import {
  createContact,
  createDeal,
  createTask,
  fail,
  getContact,
  getDeal,
  getPanelAuthConfig,
  json,
  listTasks,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { normalizeAzPhone } from "@/lib/enrollment/enrollment";

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;
const HOUR = 3_600_000;

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * Staff-operated, single-transaction intake. Requires an Idempotency-Key header:
 * a retry returns the original deal/task; reuse with different input is rejected.
 * No AI answer is generated and no external message is sent.
 */
export const POST = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return fail(415, "unsupported_media_type");
    }
    const key = req.headers.get("idempotency-key") ?? "";
    if (!IDEMPOTENCY_KEY_RE.test(key)) return fail(422, "invalid_input", { field: "idempotencyKey" });
    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json");
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "invalid_json");
    const input = raw as Record<string, unknown>;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const details = typeof input.message === "string" ? input.message.trim() : "";
    const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
    const phone = rawPhone ? normalizeAzPhone(rawPhone) : null;
    const source = input.source === undefined ? "manual" : input.source;
    if (!name || name.length > 120) return fail(422, "invalid_input", { field: "name" });
    if (!title || title.length > 120) return fail(422, "invalid_input", { field: "title" });
    if (!details || details.length > 10000) return fail(422, "invalid_input", { field: "message" });
    if (rawPhone && !phone) return fail(422, "invalid_input", { field: "phone" });
    if (source !== "manual" && source !== "web") return fail(422, "invalid_input", { field: "source" });

    // Caller may schedule follow-up explicitly; otherwise use a documented 24-hour default.
    // This is a task due time, not a notification delivery guarantee.
    let explicitDueAt: string | null = null;
    const now = Date.now();
    if (input.dueAt !== undefined) {
      if (typeof input.dueAt !== "string" ||
          !/T\d{2}:\d{2}/.test(input.dueAt) ||
          !/(?:Z|[+-]\d{2}:\d{2})$/.test(input.dueAt)) {
        return fail(422, "invalid_input", { field: "dueAt" });
      }
      const parsed = Date.parse(input.dueAt);
      if (!Number.isFinite(parsed) || parsed <= now || parsed > now + 365 * 24 * HOUR) {
        return fail(422, "invalid_input", { field: "dueAt" });
      }
      explicitDueAt = new Date(parsed).toISOString();
    }
    const dueAt = explicitDueAt ?? new Date(now + 24 * HOUR).toISOString();
    const requestHash = digest(JSON.stringify({
      name, phone, title, details, source, dueAt: explicitDueAt,
    }));

    return withWorkspace(member, async (actor, db) => {
      if (actor.role === "operator") return fail(403, "forbidden");

      // PostgreSQL advisory transaction lock serializes same-key requests across
      // serverless instances. The SQLite fallback already serializes savepoints.
      // Other keys for the same phone are deduplicated by the DB unique index below.
      const dealId = "intake_" + digest(JSON.stringify([actor.tenantId, key])).slice(0, 48);
      if (process.env.QEYDAI_DATABASE_URL) {
        await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
          JSON.stringify([actor.tenantId, key]),
        ]);
      }

      const existing = await getDeal(db, actor.tenantId, dealId);
      if (existing) {
        let saved: { digest?: string; taskId?: string } = {};
        try {
          const fields = JSON.parse(existing.fields) as { panelimIntake?: typeof saved };
          saved = fields.panelimIntake ?? {};
        } catch {
          // A deleted or externally modified intake cannot be safely replayed.
        }
        if (saved.digest !== requestHash) return fail(409, "idempotency_conflict");
        const contact = await getContact(db, actor.tenantId, existing.contactId);
        const task = (await listTasks(db, actor.tenantId, dealId)).find((t) => t.id === saved.taskId);
        if (!contact || !task) return fail(409, "intake_replay_unavailable");
        return json(200, { ok: true, replayed: true, contact, deal: existing, task });
      }

      let contact;
      if (phone) {
        // Upsert is concurrency-safe in PostgreSQL. The no-op conflict update
        // preserves the original customer's name and metadata.
        const matched = await db.query<{ id: string }>(`
          INSERT INTO sales_contacts (tenant_id,id,name,phone)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (tenant_id,phone) DO UPDATE SET phone=excluded.phone
          RETURNING id
        `, [actor.tenantId, randomUUID(), name, phone]);
        contact = matched.rows[0]
          ? await getContact(db, actor.tenantId, matched.rows[0].id)
          : null;
      } else {
        contact = await createContact(db, actor.tenantId, name, null);
      }
      if (!contact) throw new Error("intake_contact_failed");

      const deal = await createDeal(
        db, actor.tenantId, dealId, contact.id, "new", title, source, 0, details,
      );
      if (!deal) throw new Error("intake_deal_failed");
      const task = await createTask(
        db, actor.tenantId, deal.id, "Müştəri müraciətini cavablandır", details,
        null, dueAt,
      );
      if (!task) throw new Error("intake_task_failed");

      // Commit idempotency metadata only together with the complete workflow.
      const updated = await db.query(
        "UPDATE sales_deals SET fields=$3 WHERE tenant_id=$1 AND id=$2",
        [actor.tenantId, deal.id, JSON.stringify({
          panelimIntake: { digest: requestHash, taskId: task.id },
        })],
      );
      if (updated.rowCount !== 1) throw new Error("intake_metadata_failed");
      return json(201, {
        ok: true, replayed: false, contact,
        deal: { ...deal, fields: JSON.stringify({ panelimIntake: { digest: requestHash, taskId: task.id } }) },
        task,
      });
    });
  });
