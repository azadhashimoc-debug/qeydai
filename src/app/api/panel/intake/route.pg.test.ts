import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  adminKeyFingerprint, createPanelSessionToken, derivePanelSecret, PANEL_COOKIE_NAME,
} from "@/lib/api/panel-auth";
import {
  createContact, createDeal, createTask, initializeWorkspace, workspaceTransaction,
} from "@/lib/crm/store";
import { POST } from "./route";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const tenantA = "pg_a_" + randomUUID().slice(0, 20);
const tenantB = "pg_b_" + randomUUID().slice(0, 20);
const alphaKey = "pg-alpha-key-0123456789abcdef";
const betaKey = "pg-beta-key-0123456789abcdef";
const keys = { [alphaKey]: tenantA, [betaKey]: tenantB };
const secret = "pg-intake-session-secret-0123456789abcdef";
const valid = {
  name: "Nigar", phone: "050 123 45 67",
  title: "Klinika konsultasiyası", message: "Sabah uyğun saat varmı?",
  source: "manual",
};
let previous: { admin?: string; secret?: string };

function request(
  tenant: string, input: unknown = valid,
  opts: { idem?: string; origin?: string; member?: string; contentType?: string } = {},
) {
  const k = tenant === tenantA ? alphaKey : betaKey;
  const token = createPanelSessionToken(
    tenant, derivePanelSecret(keys, secret)!, Date.now(), 3_600_000,
    adminKeyFingerprint(k), opts.member,
  );
  return new Request("http://localhost:3000/api/panel/intake", {
    method: "POST",
    headers: {
      cookie: `${PANEL_COOKIE_NAME}=${token}`,
      origin: opts.origin ?? "http://localhost:3000",
      "content-type": opts.contentType ?? "application/json",
      "idempotency-key": opts.idem ?? randomUUID(),
    },
    body: JSON.stringify(input),
  });
}

async function count(tenant: string, table: "sales_contacts" | "sales_deals" | "sales_tasks") {
  return workspaceTransaction(tenant, async (db) => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${table} WHERE tenant_id=$1`, [tenant],
    );
    return Number(rows[0].count);
  });
}

suite("CRM intake PostgreSQL integration (non-superuser, forced RLS)", () => {
  beforeAll(async () => {
    previous = {
      admin: process.env.QEYDAI_ADMIN_KEYS,
      secret: process.env.QEYDAI_PANEL_SECRET,
    };
    process.env.QEYDAI_ADMIN_KEYS = JSON.stringify(keys);
    process.env.QEYDAI_PANEL_SECRET = secret;
    for (const tenant of [tenantA, tenantB]) {
      await workspaceTransaction(tenant, async (db) => initializeWorkspace(db, tenant));
    }
    await workspaceTransaction(tenantA, async (db) => {
      const result = await db.query<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>(
        `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user`,
      );
      // CI uses a dedicated non-owner role; Neon staging can use a different
      // non-superuser role. Forced RLS still applies to table owners.
      if (process.env.CI === "true") {
        expect(result.rows[0].rolname).toBe("panelim_ci");
      }
      expect(result.rows[0].rolsuper).toBe(false);
      expect(result.rows[0].rolbypassrls).toBe(false);
    });
  });

  afterAll(() => {
    if (previous.admin === undefined) delete process.env.QEYDAI_ADMIN_KEYS;
    else process.env.QEYDAI_ADMIN_KEYS = previous.admin;
    if (previous.secret === undefined) delete process.env.QEYDAI_PANEL_SECRET;
    else process.env.QEYDAI_PANEL_SECRET = previous.secret;
  });

  it("stores an entire contact-deal-task chain with a non-null future dueAt", async () => {
    const response = await POST(request(tenantA));
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.deal.contactId).toBe(json.contact.id);
    expect(json.task.dealId).toBe(json.deal.id);
    expect(new Date(json.task.dueAt).getTime()).toBeGreaterThan(Date.now());
    expect(await count(tenantA, "sales_contacts")).toBe(1);
    expect(await count(tenantA, "sales_deals")).toBe(1);
    expect(await count(tenantA, "sales_tasks")).toBe(1);
  });

  it("replays the exact request without duplicating anything; conflicts on changed payload", async () => {
    const idem = randomUUID();
    const input = { ...valid, phone: "055 222 33 44" };
    const first = await (await POST(request(tenantA, input, { idem }))).json();
    const again = await POST(request(tenantA, input, { idem }));
    expect(again.status).toBe(200);
    const second = await again.json();
    expect(second.deal.id).toBe(first.deal.id);
    expect(second.task.id).toBe(first.task.id);
    expect(second.replayed).toBe(true);
    expect((await POST(request(tenantA, { ...input, title: "Change" }, { idem }))).status).toBe(409);
  });

  it("handles parallel same-phone requests and simultaneous retries", async () => {
    const idem = randomUUID();
    const input = { ...valid, phone: "070 444 55 66" };
    const identical = await Promise.all(Array.from({ length: 4 },
      () => POST(request(tenantA, input, { idem }))));
    expect(identical.map((r) => r.status).sort()).toEqual([200, 200, 200, 201]);
    const different = await Promise.all(Array.from({ length: 5 }, (_, index) =>
      POST(request(tenantA, { ...input, title: `Müraciət ${index}` }))));
    expect(different.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    await workspaceTransaction(tenantA, async (db) => {
      const result = await db.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM sales_contacts WHERE tenant_id=$1 AND phone=$2",
        [tenantA, "+994704445566"],
      );
      expect(Number(result.rows[0].count)).toBe(1);
    });
  });

  it("enforces RLS tenant isolation for contacts, deals and tasks", async () => {
    const input = { ...valid, phone: "077 888 99 00" };
    const a = await (await POST(request(tenantA, input))).json();
    const b = await (await POST(request(tenantB, input))).json();
    expect(a.contact.id).not.toBe(b.contact.id);
    await workspaceTransaction(tenantA, async (db) => {
      for (const table of ["sales_contacts", "sales_deals", "sales_tasks"]) {
        const result = await db.query(`SELECT id FROM ${table} WHERE tenant_id=$1`, [tenantB]);
        expect(result.rows).toHaveLength(0);
      }
    });
    expect(await count(tenantB, "sales_contacts")).toBe(1);
  });

  it("rolls back after a contact when deal creation fails on an actual FK", async () => {
    const phone = "+994501110001";
    await expect(workspaceTransaction(tenantA, async (db) => {
      await initializeWorkspace(db, tenantA);
      const contact = await createContact(db, tenantA, "Rollback Deal", phone);
      expect(contact).not.toBeNull();
      await createDeal(db, tenantA, randomUUID(), contact!.id, "missing_stage", "Broken", "manual", 0, "");
    })).rejects.toThrow();
    await workspaceTransaction(tenantA, async (db) => {
      const q = await db.query("SELECT id FROM sales_contacts WHERE tenant_id=$1 AND phone=$2", [tenantA, phone]);
      expect(q.rows).toHaveLength(0);
    });
  });

  it("rolls back contact and deal after a task FK failure", async () => {
    const phone = "+994501110002";
    await expect(workspaceTransaction(tenantA, async (db) => {
      await initializeWorkspace(db, tenantA);
      const contact = await createContact(db, tenantA, "Rollback Task", phone);
      const deal = await createDeal(db, tenantA, randomUUID(), contact!.id, "new", "Rollback", "manual", 0, "");
      expect(deal).not.toBeNull();
      await createTask(db, tenantA, "non_existing_deal", "Follow up", "", null, new Date(Date.now() + 3600_000).toISOString());
    })).rejects.toThrow();
    await workspaceTransaction(tenantA, async (db) => {
      const c = await db.query("SELECT id FROM sales_contacts WHERE tenant_id=$1 AND phone=$2", [tenantA, phone]);
      const d = await db.query("SELECT id FROM sales_deals WHERE tenant_id=$1 AND title='Rollback'", [tenantA]);
      expect(c.rows).toHaveLength(0);
      expect(d.rows).toHaveLength(0);
    });
  });

  it("verifies the sales schema, tenant RLS and composite foreign-key actions", async () => {
    await workspaceTransaction(tenantA, async (db) => {
      const tables = await db.query<{
        relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean;
      }>(`
        SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'sales_%'
      `);
      expect(tables.rows).toHaveLength(17);
      expect(tables.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
      const legacy = await db.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(`
        SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
        WHERE oid IN ('sessions'::regclass, 'enrollments'::regclass,
                      'crm_leads'::regclass, 'inbox_messages'::regclass)
      `);
      expect(legacy.rows).toHaveLength(4);
      expect(legacy.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
      const policies = await db.query<{ tablename: string }>(`
        SELECT tablename FROM pg_policies
        WHERE schemaname='public' AND tablename LIKE 'sales_%'
      `);
      expect(new Set(policies.rows.map((r) => r.tablename)).size).toBe(17);
      const foreignKeys = await db.query<{ table_name: string; definition: string }>(`
        SELECT c.conrelid::regclass::text AS table_name,
               pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c
        WHERE c.contype='f' AND c.conrelid IN
          ('sales_deals'::regclass, 'sales_tasks'::regclass, 'sales_notes'::regclass)
      `);
      for (const [table, column] of [
        ["sales_deals", "assignee_id"], ["sales_tasks", "assignee_id"], ["sales_notes", "author_id"],
      ]) {
        expect(foreignKeys.rows.some((fk) =>
          fk.table_name === table &&
          fk.definition.includes(`ON DELETE SET NULL (${column})`),
        )).toBe(true);
      }
    });
  });

  it("keeps tenant IDs on deals, tasks and notes when an assigned member is deleted", async () => {
    await workspaceTransaction(tenantA, async (db) => {
      const memberId = randomUUID();
      await db.query("INSERT INTO sales_members (tenant_id,id,name,role) VALUES ($1,$2,'Temporary','operator')", [
        tenantA, memberId,
      ]);
      const contact = await createContact(db, tenantA, "Member FK Test", null);
      expect(contact).not.toBeNull();
      const deal = await createDeal(db, tenantA, randomUUID(), contact!.id, "new", "Member deletion", "manual", 0, "");
      expect(deal).not.toBeNull();
      await db.query("UPDATE sales_deals SET assignee_id=$3 WHERE tenant_id=$1 AND id=$2", [
        tenantA, deal!.id, memberId,
      ]);
      const task = await createTask(db, tenantA, deal!.id, "Follow up", "", memberId, null);
      expect(task).not.toBeNull();
      const noteId = randomUUID();
      await db.query(
        "INSERT INTO sales_notes (tenant_id,id,deal_id,author_id,body) VALUES ($1,$2,$3,$4,'Test note')",
        [tenantA, noteId, deal!.id, memberId],
      );
      await db.query("DELETE FROM sales_members WHERE tenant_id=$1 AND id=$2", [tenantA, memberId]);
      for (const [table, id, column] of [
        ["sales_deals", deal!.id, "assignee_id"],
        ["sales_tasks", task!.id, "assignee_id"],
        ["sales_notes", noteId, "author_id"],
      ]) {
        const result = await db.query<{ tenant_id: string; nullable_id: string | null }>(
          `SELECT tenant_id, ${column} AS nullable_id FROM ${table} WHERE tenant_id=$1 AND id=$2`,
          [tenantA, id],
        );
        expect(result.rows[0]).toMatchObject({ tenant_id: tenantA, nullable_id: null });
      }
      const fieldId = randomUUID();
      await db.query(
        "INSERT INTO sales_custom_field_defs (tenant_id,id,name,kind) VALUES ($1,$2,$3,'text')",
        [tenantA, fieldId, "Test " + fieldId],
      );
      const defaultValue = await db.query<{ is_json_null: boolean }>(
        `INSERT INTO sales_deal_field_values (tenant_id,deal_id,field_id)
         VALUES ($1,$2,$3) RETURNING value='null'::jsonb AS is_json_null`,
        [tenantA, deal!.id, fieldId],
      );
      expect(defaultValue.rows[0].is_json_null).toBe(true);
    });
  });

  it("rejects cross-tenant inserts at the database policy layer", async () => {
    await expect(workspaceTransaction(tenantA, async (db) => {
      await db.query(
        "INSERT INTO sales_contacts (tenant_id,id,name) VALUES ($1,$2,'Cross tenant')",
        [tenantB, randomUUID()],
      );
    })).rejects.toMatchObject({ code: "42501" });
  });

  it("blocks unauthenticated, operator, cross-origin, and malformed input", async () => {
    expect((await POST(new Request("http://localhost:3000/api/panel/intake", { method: "POST" }))).status).toBe(401);
    await workspaceTransaction(tenantA, async (db) => {
      await db.query(
        "INSERT INTO sales_members (tenant_id,id,name,role) VALUES ($1,$2,$3,$4)",
        [tenantA, "operator_pg", "Operator", "operator"],
      );
    });
    expect((await POST(request(tenantA, valid, { member: "operator_pg" }))).status).toBe(403);
    expect((await POST(request(tenantA, valid, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(request(tenantA, { ...valid, message: "" }))).status).toBe(422);
    expect((await POST(request(tenantA, { ...valid, dueAt: "not a date" }))).status).toBe(422);
  });
});
