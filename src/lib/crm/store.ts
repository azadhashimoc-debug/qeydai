import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { normalizeAzPhone } from "../enrollment/enrollment";
import type { SqliteEnrollmentStore } from "../enrollment/sqlite-store";
import type { InboundMessage } from "./channels";
import { getSharedStore } from "../api/instance";
import { assertSafeApplicationRole, type PgClient } from "../enrollment/postgres-store";

const sqliteStoreMap = new WeakMap<object, SqliteEnrollmentStore>();

function getSqliteStore(db: PoolClient): SqliteEnrollmentStore | undefined {
  return sqliteStoreMap.get(db as unknown as object);
}

/** Adapts node:sqlite sync `DatabaseSync` into the async `query(sql, params?) => { rows, rowCount }`
 * interface used by legacy callers when running on SQLite. */
class SqliteQueryAdapter {
  constructor(private db: DatabaseSync) {}
  query(text: string, params: unknown[] = []): Promise<{ rows: unknown[]; rowCount?: number }> {
    try {
      const bound: SQLInputValue[] = [];
      const sql = text.replace(/\$(\d+)/g, (_, idx: string) => {
        bound.push((params[Number(idx) - 1] ?? null) as SQLInputValue);
        return "?";
      });
      const stmt = this.db.prepare(sql);
      const effectiveParams = (bound.length > 0 ? bound : params) as SQLInputValue[];
      if (/^\s*(SELECT|WITH)\b/i.test(sql) || /\bRETURNING\b/i.test(sql)) {
        const rows = stmt.all(...effectiveParams);
        return Promise.resolve({ rows: rows as unknown[], rowCount: rows.length });
      }
      const res = stmt.run(...effectiveParams);
      return Promise.resolve({ rows: [], rowCount: Number(res.changes) });
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

export type SalesRole = "owner" | "manager" | "operator";

export type SalesStage = {
  id: string;
  name: string;
  position: number;
  kind: "open" | "won" | "lost";
};

export type SalesDeal = {
  id: string;
  contactId: string;
  stageId: string;
  assigneeId: string | null;
  title: string;
  source: string;
  amountMinor: number;
  fields: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  contactName?: string;
  contactPhone?: string | null;
  stageName?: string;
  stageKind?: string;
};

export type SalesContact = {
  id: string;
  name: string;
  phone: string | null;
  phoneVerified: boolean;
  tags: string[];
  createdAt: string;
};

export type SalesTask = {
  id: string;
  dealId: string;
  assigneeId: string | null;
  title: string;
  body: string;
  status: "open" | "done" | "canceled";
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SalesNote = {
  id: string;
  dealId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
};

export type SalesFieldDef = {
  id: string;
  name: string;
  kind: "text" | "number" | "date" | "boolean";
  required: boolean;
  position: number;
};

export type SalesFieldValue = { fieldId: string; value: string };

export type SalesMember = { id: string; name: string; role: SalesRole };

export type SalesPhoneMatch = {
  id: string;
  contactId: string;
  normalizedPhone: string;
  channel: string;
  senderId: string;
  confirmed: boolean;
  createdAt: string;
};

export type SalesWorkspace = {
  id: string;
  name: string;
  locale: string;
  timezone: string;
  currency: string;
};

export async function requireMember(
  db: PoolClient,
  tenant: string,
  memberId: string | null,
): Promise<{ memberId: string; role: SalesRole } | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.requireSalesMember(tenant, memberId);
  if (!memberId) return null;
  const r = await db.query<{ id: string; role: SalesRole }>(
    "SELECT id, role FROM sales_members WHERE tenant_id=$1 AND id=$2",
    [tenant, memberId],
  );
  if (!r.rows[0]) return null;
  return { memberId: r.rows[0].id, role: r.rows[0].role };
}

export function canWrite(role: SalesRole, resource: string): boolean {
  if (role === "owner") return true;
  if (role === "manager") return true;
  return (
    resource === "tasks" ||
    resource === "notes" ||
    resource === "phoneMatches" ||
    resource === "messages"
  );
}

export async function listStages(db: PoolClient, tenant: string): Promise<SalesStage[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesStages(tenant);
  const r = await db.query<SalesStage>(
    "SELECT id,name,position,kind FROM sales_stages WHERE tenant_id=$1 ORDER BY position,id",
    [tenant],
  );
  return r.rows;
}

export async function createStage(
  db: PoolClient,
  tenant: string,
  name: string,
): Promise<SalesStage | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.createSalesStage(tenant, name);
  const r = await db.query<SalesStage>(
    `INSERT INTO sales_stages (tenant_id,id,name,position,kind)
     SELECT $1,$2,$3,coalesce((SELECT max(position) FROM sales_stages WHERE tenant_id=$1),0)+1,'open'
     RETURNING id,name,position,kind`,
    [tenant, randomUUID(), name],
  );
  return r.rows[0] ?? null;
}

export async function updateStage(
  db: PoolClient,
  tenant: string,
  id: string,
  name: string,
): Promise<boolean> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.updateSalesStage(tenant, id, name);
  const r = await db.query(
    "UPDATE sales_stages SET name=$3 WHERE tenant_id=$1 AND id=$2 AND kind='open'",
    [tenant, id, name],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function deleteStage(db: PoolClient, tenant: string, id: string): Promise<boolean> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.deleteSalesStage(tenant, id);
  const used = await db.query("SELECT 1 FROM sales_deals WHERE tenant_id=$1 AND stage_id=$2 LIMIT 1", [
    tenant,
    id,
  ]);
  if ((used.rowCount ?? 0) > 0) return false;
  const r = await db.query("DELETE FROM sales_stages WHERE tenant_id=$1 AND id=$2 AND kind='open'", [
    tenant,
    id,
  ]);
  return (r.rowCount ?? 0) > 0;
}

function serializeFields(fields: unknown): string {
  if (typeof fields === "string") return fields;
  return JSON.stringify(fields ?? {});
}

export async function listDeals(db: PoolClient, tenant: string): Promise<SalesDeal[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesDeals(tenant);
  const r = await db.query<SalesDeal>(`
    SELECT d.id AS id,d.contact_id AS "contactId",d.stage_id AS "stageId",d.assignee_id AS "assigneeId",d.title AS title,d.source AS source,d.amount_minor AS "amountMinor",d.fields AS fields,d.note AS note,
           d.created_at AS "createdAt",d.updated_at AS "updatedAt",
           c.name AS "contactName",c.phone AS "contactPhone",
           s.name AS "stageName",s.kind AS "stageKind"
    FROM sales_deals d
    JOIN sales_contacts c ON (c.tenant_id,c.id)=(d.tenant_id,d.contact_id)
    JOIN sales_stages s ON (s.tenant_id,s.id)=(d.tenant_id,d.stage_id)
    WHERE d.tenant_id=$1
    ORDER BY d.updated_at DESC,d.id
    LIMIT 500`, [tenant]);
  return r.rows.map((row) => ({
    ...row,
    amountMinor: Number(row.amountMinor),
    fields: serializeFields(row.fields),
  }));
}

export async function getDeal(db: PoolClient, tenant: string, id: string): Promise<SalesDeal | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.getSalesDeal(tenant, id);
  const r = await db.query<SalesDeal>(`
    SELECT d.id AS id,d.contact_id AS "contactId",d.stage_id AS "stageId",d.assignee_id AS "assigneeId",d.title AS title,d.source AS source,d.amount_minor AS "amountMinor",d.fields AS fields,d.note AS note,
           d.created_at AS "createdAt",d.updated_at AS "updatedAt",
           c.name AS "contactName",c.phone AS "contactPhone",
           s.name AS "stageName",s.kind AS "stageKind"
    FROM sales_deals d
    JOIN sales_contacts c ON (c.tenant_id,c.id)=(d.tenant_id,d.contact_id)
    JOIN sales_stages s ON (s.tenant_id,s.id)=(d.tenant_id,d.stage_id)
    WHERE d.tenant_id=$1 AND d.id=$2`, [tenant, id]);
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  return {
    ...row,
    amountMinor: Number(row.amountMinor),
    fields: serializeFields(row.fields),
  };
}

export async function updateDeal(
  db: PoolClient,
  tenant: string,
  id: string,
  patch: {
    stageId?: string;
    title?: string;
    note?: string;
    amountMinor?: number;
    assigneeId?: string | null;
  },
): Promise<SalesDeal | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.updateSalesDeal(tenant, id, patch);
  const sets: string[] = [];
  const params: unknown[] = [tenant, id];
  let p = 3;
  if (patch.stageId !== undefined) { sets.push(`stage_id=$${p++}`); params.push(patch.stageId); }
  if (patch.title !== undefined) { sets.push(`title=$${p++}`); params.push(patch.title); }
  if (patch.note !== undefined) { sets.push(`note=$${p++}`); params.push(patch.note); }
  if (patch.amountMinor !== undefined) { sets.push(`amount_minor=$${p++}`); params.push(patch.amountMinor); }
  if (patch.assigneeId !== undefined) { sets.push(`assignee_id=$${p++}`); params.push(patch.assigneeId); }
  if (!sets.length) return getDeal(db, tenant, id);
  const prev = await db.query<{ stage_id: string }>("SELECT stage_id FROM sales_deals WHERE tenant_id=$1 AND id=$2", [tenant, id]);
  if (!prev.rows[0]) return null;
  sets.push(`updated_at=now()`);
  await db.query(`UPDATE sales_deals SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2`, params);
  if (patch.stageId !== undefined && patch.stageId !== prev.rows[0].stage_id) {
    await db.query(
      "INSERT INTO sales_activity (tenant_id,deal_id,kind,data) VALUES ($1,$2,'stage_changed',$3)",
      [tenant, id, JSON.stringify({ from: prev.rows[0].stage_id, to: patch.stageId })],
    );
  }
  return getDeal(db, tenant, id);
}

export async function createDeal(
  db: PoolClient,
  tenant: string,
  id: string,
  contactId: string,
  stageId: string,
  title: string,
  source: string,
  amountMinor: number,
  note: string,
): Promise<SalesDeal | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.createSalesDeal(tenant, id, contactId, stageId, title, source, amountMinor, note);
  const existing = await db.query("SELECT 1 FROM sales_deals WHERE tenant_id=$1 AND id=$2", [tenant, id]);
  if ((existing.rowCount ?? 0) > 0) return null;
  await db.query(`
    INSERT INTO sales_deals (tenant_id,id,contact_id,stage_id,title,source,amount_minor,note)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
  [tenant, id, contactId, stageId, title, source, amountMinor, note]);
  return getDeal(db, tenant, id);
}

export async function deleteDeal(db: PoolClient, tenant: string, id: string): Promise<boolean> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.deleteSalesDeal(tenant, id);
  const r = await db.query("DELETE FROM sales_deals WHERE tenant_id=$1 AND id=$2", [tenant, id]);
  return (r.rowCount ?? 0) > 0;
}

export async function claimDeal(
  db: PoolClient,
  tenant: string,
  dealId: string,
  memberId: string,
): Promise<"ok" | "already-claimed" | "not-found" | "no-member"> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.claimSalesDeal(tenant, dealId, memberId);
  const member = await db.query<{ id: string }>(
    "SELECT id FROM sales_members WHERE tenant_id=$1 AND id=$2", [tenant, memberId],
  );
  if (!member.rows[0]) return "no-member";
  const r = await db.query(`
    UPDATE sales_deals SET assignee_id=$3, updated_at=now()
    WHERE tenant_id=$1 AND id=$2 AND assignee_id IS NULL
    RETURNING id`, [tenant, dealId, memberId]);
  if (r.rows[0]) return "ok";
  const exists = await db.query("SELECT 1 FROM sales_deals WHERE tenant_id=$1 AND id=$2", [tenant, dealId]);
  if (!exists.rows[0]) return "not-found";
  return "already-claimed";
}

export type PageOpts = { limit?: number; offset?: number };
const MAX_PAGE_SIZE = 500;

function pageParams(opts?: PageOpts): [number, number] {
  const limit = opts?.limit !== undefined ? Math.min(Math.max(0, Number(opts.limit)), MAX_PAGE_SIZE) : MAX_PAGE_SIZE;
  const offset = opts?.offset !== undefined ? Math.max(0, Number(opts.offset)) : 0;
  return [limit, offset];
}

export async function listContacts(db: PoolClient, tenant: string, opts?: PageOpts): Promise<SalesContact[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesContacts(tenant, opts);
  const [limit, offset] = pageParams(opts);
  const r = await db.query<SalesContact>(`
    SELECT id AS id,name AS name,phone AS phone,phone_verified AS "phoneVerified",tags AS tags,created_at AS "createdAt" FROM sales_contacts
    WHERE tenant_id=$1 ORDER BY name LIMIT $2 OFFSET $3`, [tenant, limit, offset]);
  return r.rows.map((row) => ({
    ...row,
    phoneVerified: Boolean(row.phoneVerified),
    tags: Array.isArray(row.tags) ? row.tags : [],
  }));
}

export async function createContact(
  db: PoolClient,
  tenant: string,
  name: string,
  phone: string | null,
): Promise<SalesContact | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.createSalesContact(tenant, name, phone);
  const r = await db.query<SalesContact>(`
    INSERT INTO sales_contacts (tenant_id,id,name,phone) VALUES ($1,$2,$3,$4)
    RETURNING id AS id,name AS name,phone AS phone,phone_verified AS "phoneVerified",tags AS tags,created_at AS "createdAt"`,
    [tenant, randomUUID(), name, phone]);
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  return { ...row, phoneVerified: Boolean(row.phoneVerified), tags: Array.isArray(row.tags) ? row.tags : [] };
}

export async function getContact(db: PoolClient, tenant: string, id: string): Promise<SalesContact | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.getSalesContact(tenant, id);
  const r = await db.query<SalesContact>(
    `SELECT id AS id,name AS name,phone AS phone,phone_verified AS "phoneVerified",tags AS tags,created_at AS "createdAt" FROM sales_contacts WHERE tenant_id=$1 AND id=$2`,
    [tenant, id]);
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  return { ...row, phoneVerified: Boolean(row.phoneVerified), tags: Array.isArray(row.tags) ? row.tags : [] };
}

export async function deleteContact(db: PoolClient, tenant: string, id: string): Promise<boolean> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.deleteSalesContact(tenant, id);
  const r = await db.query("DELETE FROM sales_contacts WHERE tenant_id=$1 AND id=$2", [tenant, id]);
  return (r.rowCount ?? 0) > 0;
}

export async function listTasks(
  db: PoolClient,
  tenant: string,
  dealId?: string,
  opts?: PageOpts,
): Promise<SalesTask[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesTasks(tenant, dealId);
  const [limit, offset] = pageParams(opts);
  const r = await db.query<SalesTask>(dealId
    ? `SELECT id AS id,deal_id AS "dealId",assignee_id AS "assigneeId",title AS title,body AS body,status AS status,due_at AS "dueAt",created_at AS "createdAt",updated_at AS "updatedAt"
       FROM sales_tasks WHERE tenant_id=$1 AND deal_id=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`
    : `SELECT id AS id,deal_id AS "dealId",assignee_id AS "assigneeId",title AS title,body AS body,status AS status,due_at AS "dueAt",created_at AS "createdAt",updated_at AS "updatedAt"
       FROM sales_tasks WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    dealId ? [tenant, dealId, limit, offset] : [tenant, limit, offset]);
  return r.rows.map((row) => ({
    ...row,
    assigneeId: row.assigneeId ?? null,
    dueAt: row.dueAt ?? null,
  }));
}

export async function createTask(
  db: PoolClient,
  tenant: string,
  dealId: string,
  title: string,
  body: string,
  assigneeId: string | null,
  dueAt: string | null,
): Promise<SalesTask | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.createSalesTask(tenant, dealId, title, body, assigneeId, dueAt);
  const r = await db.query<SalesTask>(`
    INSERT INTO sales_tasks (tenant_id,id,deal_id,assignee_id,title,body,due_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING id AS id,deal_id AS "dealId",assignee_id AS "assigneeId",title AS title,body AS body,status AS status,due_at AS "dueAt",created_at AS "createdAt",updated_at AS "updatedAt"`,
    [tenant, randomUUID(), dealId, assigneeId, title, body, dueAt]);
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  await db.query(
    "INSERT INTO sales_activity (tenant_id,deal_id,kind,data) VALUES ($1,$2,'task_created',$3)",
    [tenant, dealId, JSON.stringify({ taskId: row.id, title: row.title })],
  );
  return { ...row, assigneeId: row.assigneeId ?? null, dueAt: row.dueAt ?? null };
}

export async function updateTask(
  db: PoolClient,
  tenant: string,
  id: string,
  patch: { title?: string; body?: string; status?: "open" | "done" | "canceled"; assigneeId?: string | null; dueAt?: string | null },
): Promise<SalesTask | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.updateSalesTask(tenant, id, patch);
  const sets: string[] = [];
  const params: unknown[] = [tenant, id];
  let p = 3;
  if (patch.title !== undefined) { sets.push(`title=$${p++}`); params.push(patch.title); }
  if (patch.body !== undefined) { sets.push(`body=$${p++}`); params.push(patch.body); }
  if (patch.status !== undefined) { sets.push(`status=$${p++}`); params.push(patch.status); }
  if (patch.assigneeId !== undefined) { sets.push(`assignee_id=$${p++}`); params.push(patch.assigneeId); }
  if (patch.dueAt !== undefined) { sets.push(`due_at=$${p++}`); params.push(patch.dueAt); }
  if (!sets.length) return null;
  sets.push(`updated_at=now()`);
  const r = await db.query<SalesTask>(`UPDATE sales_tasks SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2 RETURNING id AS id,deal_id AS "dealId",assignee_id AS "assigneeId",title AS title,body AS body,status AS status,due_at AS "dueAt",created_at AS "createdAt",updated_at AS "updatedAt"`, params);
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  if (patch.status === "done") {
    await db.query(
      "INSERT INTO sales_activity (tenant_id,deal_id,kind,data) VALUES ($1,$2,'task_done',$3)",
      [tenant, row.dealId, JSON.stringify({ taskId: row.id, title: row.title })],
    );
  }
  return { ...row, assigneeId: row.assigneeId ?? null, dueAt: row.dueAt ?? null };
}

export async function deleteTask(db: PoolClient, tenant: string, id: string): Promise<boolean> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.deleteSalesTask(tenant, id);
  const r = await db.query("DELETE FROM sales_tasks WHERE tenant_id=$1 AND id=$2", [tenant, id]);
  return (r.rowCount ?? 0) > 0;
}

export async function listNotes(
  db: PoolClient,
  tenant: string,
  dealId?: string,
  opts?: PageOpts,
): Promise<SalesNote[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesNotes(tenant, dealId);
  const [limit, offset] = pageParams(opts);
  const r = await db.query<SalesNote>(dealId
    ? `SELECT id AS id,deal_id AS "dealId",author_id AS "authorId",body AS body,created_at AS "createdAt"
       FROM sales_notes WHERE tenant_id=$1 AND deal_id=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`
    : `SELECT id AS id,deal_id AS "dealId",author_id AS "authorId",body AS body,created_at AS "createdAt"
       FROM sales_notes WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    dealId ? [tenant, dealId, limit, offset] : [tenant, limit, offset]);
  return r.rows.map((row) => ({ ...row, authorId: row.authorId ?? null }));
}

export async function createNote(
  db: PoolClient,
  tenant: string,
  dealId: string,
  body: string,
  authorId: string | null,
): Promise<SalesNote | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.createSalesNote(tenant, dealId, body, authorId);
  const r = await db.query<SalesNote>(`
    INSERT INTO sales_notes (tenant_id,id,deal_id,author_id,body)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING id AS id,deal_id AS "dealId",author_id AS "authorId",body AS body,created_at AS "createdAt"`,
    [tenant, randomUUID(), dealId, authorId, body]);
  if (!r.rows[0]) return null;
  await db.query(
    "INSERT INTO sales_activity (tenant_id,deal_id,kind,data) VALUES ($1,$2,'note_added',$3)",
    [tenant, dealId, JSON.stringify({ noteId: r.rows[0].id })],
  );
  return { ...r.rows[0], authorId: r.rows[0].authorId ?? null };
}

export async function deleteNote(db: PoolClient, tenant: string, id: string): Promise<boolean> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.deleteSalesNote(tenant, id);
  const r = await db.query("DELETE FROM sales_notes WHERE tenant_id=$1 AND id=$2", [tenant, id]);
  return (r.rowCount ?? 0) > 0;
}

export async function listFieldDefs(db: PoolClient, tenant: string): Promise<SalesFieldDef[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesFieldDefs(tenant);
  const r = await db.query<SalesFieldDef>(
    "SELECT id,name,kind,required,position FROM sales_custom_field_defs WHERE tenant_id=$1 ORDER BY position,id",
    [tenant]);
  return r.rows.map((row) => ({ ...row, required: Boolean(row.required) }));
}

export async function createFieldDef(
  db: PoolClient,
  tenant: string,
  name: string,
  kind: "text" | "number" | "date" | "boolean",
  required: boolean,
): Promise<SalesFieldDef | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.createSalesFieldDef(tenant, name, kind, required);
  const r = await db.query<SalesFieldDef>(`
    INSERT INTO sales_custom_field_defs (tenant_id,id,name,kind,required,position)
    SELECT $1,$2,$3,$4,$5,coalesce(max(position),0)+1 FROM sales_custom_field_defs WHERE tenant_id=$1
    RETURNING id,name,kind,required,position`,
    [tenant, randomUUID(), name, kind, required]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], required: Boolean(r.rows[0].required) };
}

export async function updateFieldDef(
  db: PoolClient,
  tenant: string,
  id: string,
  patch: { name?: string; required?: boolean; position?: number },
): Promise<SalesFieldDef | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.updateSalesFieldDef(tenant, id, patch);
  const sets: string[] = [];
  const params: unknown[] = [tenant, id];
  let p = 3;
  if (patch.name !== undefined) { sets.push(`name=$${p++}`); params.push(patch.name); }
  if (patch.required !== undefined) { sets.push(`required=$${p++}`); params.push(patch.required); }
  if (patch.position !== undefined) { sets.push(`position=$${p++}`); params.push(patch.position); }
  if (!sets.length) return null;
  const r = await db.query<SalesFieldDef>(`UPDATE sales_custom_field_defs SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2 RETURNING id,name,kind,required,position`, params);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], required: Boolean(r.rows[0].required) };
}

export async function deleteFieldDef(db: PoolClient, tenant: string, id: string): Promise<boolean> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.deleteSalesFieldDef(tenant, id);
  const r = await db.query("DELETE FROM sales_custom_field_defs WHERE tenant_id=$1 AND id=$2", [tenant, id]);
  return (r.rowCount ?? 0) > 0;
}

export async function getDealFieldValues(db: PoolClient, tenant: string, dealId: string): Promise<SalesFieldValue[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.getSalesDealFieldValues(tenant, dealId);
  const r = await db.query<{ field_id: string; value: unknown }>(
    "SELECT field_id,value FROM sales_deal_field_values WHERE tenant_id=$1 AND deal_id=$2", [tenant, dealId]);
  return r.rows.map((row) => ({
    fieldId: row.field_id,
    value: typeof row.value === "string" ? row.value : JSON.stringify(row.value ?? ""),
  }));
}

export async function setDealFieldValues(
  db: PoolClient,
  tenant: string,
  dealId: string,
  values: { fieldId: string; value: string }[],
): Promise<void> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.setSalesDealFieldValues(tenant, dealId, values);
  await db.query("DELETE FROM sales_deal_field_values WHERE tenant_id=$1 AND deal_id=$2", [tenant, dealId]);
  for (const v of values) {
    await db.query(
      "INSERT INTO sales_deal_field_values (tenant_id,deal_id,field_id,value) VALUES ($1,$2,$3,$4::jsonb)",
      [tenant, dealId, v.fieldId, JSON.stringify(v.value)],
    );
  }
}

export async function listMembers(db: PoolClient, tenant: string): Promise<SalesMember[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesMembers(tenant);
  const r = await db.query<SalesMember>("SELECT id AS id,name AS name,role AS role FROM sales_members WHERE tenant_id=$1 ORDER BY name", [tenant]);
  return r.rows;
}

export async function createMember(
  db: PoolClient,
  tenant: string,
  id: string,
  name: string,
  role: SalesRole,
): Promise<SalesMember | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.createSalesMember(tenant, id, name, role);
  const r = await db.query<SalesMember>(
    "INSERT INTO sales_members (tenant_id,id,name,role) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id,id) DO NOTHING RETURNING id AS id,name AS name,role AS role",
    [tenant, id, name, role]);
  return r.rows[0] ?? null;
}

export async function listPhoneMatches(
  db: PoolClient,
  tenant: string,
  opts?: PageOpts,
): Promise<SalesPhoneMatch[]> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesPhoneMatches(tenant, opts);
  const [limit, offset] = pageParams(opts);
  const r = await db.query<SalesPhoneMatch>(`
    SELECT id AS id,contact_id AS "contactId",normalized_phone AS "normalizedPhone",channel AS channel,sender_id AS "senderId",confirmed AS confirmed,created_at AS "createdAt"
    FROM sales_phone_matches WHERE tenant_id=$1 AND confirmed=false ORDER BY created_at LIMIT $2 OFFSET $3`,
    [tenant, limit, offset]);
  return r.rows.map((row) => ({ ...row, confirmed: Boolean(row.confirmed) }));
}

export async function confirmPhoneMatch(db: PoolClient, tenant: string, id: string): Promise<boolean> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.confirmSalesPhoneMatch(tenant, id);
  const r = await db.query<{ contact_id: string | null }>(
    "UPDATE sales_phone_matches SET confirmed=true WHERE tenant_id=$1 AND id=$2 AND confirmed=false RETURNING contact_id",
    [tenant, id]);
  if (!r.rows[0]) return false;
  if (r.rows[0].contact_id) {
    await db.query(
      "UPDATE sales_contacts SET phone_verified=true WHERE tenant_id=$1 AND id=$2",
      [tenant, r.rows[0].contact_id],
    );
  }
  return true;
}

export async function getWorkspace(db: PoolClient, tenant: string): Promise<SalesWorkspace | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.getSalesWorkspace(tenant);
  const r = await db.query<SalesWorkspace>(
    "SELECT id,name,locale,timezone,currency FROM sales_workspaces WHERE id=$1", [tenant]);
  return r.rows[0] ?? null;
}

export async function updateWorkspace(
  db: PoolClient,
  tenant: string,
  patch: { name?: string; locale?: string; timezone?: string; currency?: string },
): Promise<SalesWorkspace | null> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.updateSalesWorkspace(tenant, patch);
  const sets: string[] = [];
  const params: unknown[] = [tenant];
  let p = 2;
  if (patch.name !== undefined) { sets.push(`name=$${p++}`); params.push(patch.name); }
  if (patch.locale !== undefined) { sets.push(`locale=$${p++}`); params.push(patch.locale); }
  if (patch.timezone !== undefined) { sets.push(`timezone=$${p++}`); params.push(patch.timezone); }
  if (patch.currency !== undefined) { sets.push(`currency=$${p++}`); params.push(patch.currency); }
  if (!sets.length) return getWorkspace(db, tenant);
  await db.query(`UPDATE sales_workspaces SET ${sets.join(",")} WHERE id=$1`, params);
  return getWorkspace(db, tenant);
}

export async function listDealMessages(
  db: PoolClient,
  tenant: string,
  dealId: string,
  opts?: PageOpts,
) {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesDealMessages(tenant, dealId, opts);
  const [limit, offset] = pageParams(opts);
  const r = await db.query(`
    SELECT m.id,m.direction,m.sender,m.body,m.status,m.created_at AS "createdAt",
           t.channel,t.id AS "threadId"
    FROM sales_messages m
    JOIN sales_threads t ON (m.tenant_id,m.thread_id)=(t.tenant_id,t.id)
    WHERE m.tenant_id=$1 AND m.deal_id=$2
    ORDER BY m.created_at ASC,m.id LIMIT $3 OFFSET $4`, [tenant, dealId, limit, offset]);
  return r.rows;
}

export async function sendDealReply(
  db: PoolClient,
  tenant: string,
  dealId: string,
  body: string,
): Promise<
  | { ok: true; message: { id: string; dealId: string; body: string; direction: "out"; sender: "staff"; status: "queued" } }
  | { ok: false; error: "not_found" | "no_thread" | "reply_window_expired" }
> {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.sendSalesDealReply(tenant, dealId, body);
  const deal = await db.query("SELECT id FROM sales_deals WHERE tenant_id=$1 AND id=$2", [tenant, dealId]);
  if (!deal.rows[0]) return { ok: false, error: "not_found" };
  const threadRes = await db.query<{
    id: string;
    connection_id: string | null;
    channel: string;
    last_inbound_at: Date | string | null;
  }>(
    `SELECT id, connection_id, channel, last_inbound_at
     FROM sales_threads
     WHERE tenant_id=$1 AND deal_id=$2
     ORDER BY last_inbound_at DESC NULLS LAST, id DESC
     LIMIT 1`,
    [tenant, dealId],
  );
  const thread = threadRes.rows[0];
  if (!thread || !thread.connection_id) return { ok: false, error: "no_thread" };
  if (thread.channel === "whatsapp" || thread.channel === "instagram") {
    const lastMs = thread.last_inbound_at ? new Date(thread.last_inbound_at).getTime() : 0;
    if (!lastMs || Date.now() - lastMs > 24 * 60 * 60 * 1000) {
      return { ok: false, error: "reply_window_expired" };
    }
  }
  const messageId = randomUUID();
  await db.query(
    `INSERT INTO sales_messages (tenant_id,id,thread_id,deal_id,connection_id,provider_event_id,direction,sender,body,status)
     VALUES ($1,$2,$3,$4,$5,$6,'out','staff',$7,'queued')`,
    [tenant, messageId, thread.id, dealId, thread.connection_id, `out:${messageId}`, body],
  );
  await db.query(
    `INSERT INTO sales_outbox (tenant_id,message_id)
     VALUES ($1,$2)`,
    [tenant, messageId],
  );
  await db.query("UPDATE sales_deals SET updated_at=now() WHERE tenant_id=$1 AND id=$2", [tenant, dealId]);
  return { ok: true, message: { id: messageId, dealId, body, direction: "out", sender: "staff", status: "queued" } };
}

export async function listTimeline(
  db: PoolClient,
  tenant: string,
  dealId: string,
  opts?: PageOpts,
) {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.listSalesTimeline(tenant, dealId, opts);
  const [limit, offset] = pageParams(opts);
  const msgs = await db.query<{
    kind: string;
    id: string;
    direction: string;
    sender: string;
    body: string;
    created_at: Date | string;
  }>(`
    SELECT 'message' AS kind,m.id,m.direction,m.sender,m.body,m.created_at
    FROM sales_messages m WHERE m.tenant_id=$1 AND m.deal_id=$2 ORDER BY m.created_at ASC,m.id LIMIT $3 OFFSET $4`,
    [tenant, dealId, limit, offset]);
  const acts = await db.query<{
    kind: string;
    id: string;
    activity_kind: string;
    data: unknown;
    created_at: Date | string;
  }>(`
    SELECT 'activity' AS kind,id,kind AS activity_kind,data,created_at
    FROM sales_activity WHERE tenant_id=$1 AND deal_id=$2 ORDER BY created_at ASC LIMIT $3 OFFSET $4`,
    [tenant, dealId, limit, offset]);
  const entries = [
    ...msgs.rows.map((row) => ({
      kind: row.kind,
      id: row.id,
      direction: row.direction,
      sender: row.sender,
      body: row.body,
      createdAt: new Date(row.created_at).toISOString(),
    })),
    ...acts.rows.map((row) => ({
      kind: row.kind,
      id: row.id,
      activityKind: row.activity_kind,
      data: typeof row.data === "string" ? row.data : JSON.stringify(row.data ?? {}),
      createdAt: new Date(row.created_at).toISOString(),
    })),
  ];
  entries.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  return entries;
}

let pool: Pool | undefined;
let sqliteTxQueue: Promise<unknown> = Promise.resolve();

export function setPoolForTesting(p: Pool | undefined) {
  pool = p;
}

export function databaseConfigured() {
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  if (process.env.QEYDAI_DATABASE_URL) return true;
  // Production/serverless must not silently persist CRM records to a local
  // SQLite file that disappears across deployments or Vercel invocations.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    // Explicitly limited to the local, non-Vercel Playwright harness.
    return process.env.QEYDAI_E2E_SQLITE === "1" && !process.env.VERCEL;
  }
  return true;
}

export async function workspaceTransaction<T>(tenant: string, run: (db: PoolClient) => Promise<T>): Promise<T> {
  // Direct channel/worker callers must not silently fall back to ephemeral SQLite in production.
  if (!databaseConfigured()) throw new Error("database_unavailable");
  const connectionString = process.env.QEYDAI_DATABASE_URL;
  if (connectionString) {
    pool ??= new Pool({ connectionString, connectionTimeoutMillis: 5000 });
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await assertSafeApplicationRole(db as unknown as PgClient);
      await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
      const result = await run(db);
      await db.query("COMMIT");
      return result;
    } catch (error) {
      await db.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      db.release();
    }
  }

  // SQLite fallback (dev / unit / e2e): serialize transactions on single DatabaseSync handle.
  // Because DatabaseSync is synchronous, savepoints allow safe nesting without holding an open
  // transaction across async microtask ticks where non-queued handlers might also touch SQLite.
  const next = sqliteTxQueue.then(async () => {
    const sqliteStore = getSharedStore();
    const db = sqliteStore.getSqliteDb();
    const adapter = new SqliteQueryAdapter(db);
    sqliteStoreMap.set(adapter, sqliteStore);
    const sp = `sp_${randomUUID().replace(/-/g, "")}`;
    db.exec(`SAVEPOINT ${sp}`);
    try {
      const result = await run(adapter as unknown as PoolClient);
      db.exec(`RELEASE SAVEPOINT ${sp}`);
      return result;
    } catch (error) {
      try {
        db.exec(`ROLLBACK TO SAVEPOINT ${sp}`);
        db.exec(`RELEASE SAVEPOINT ${sp}`);
      } catch {
        /* savepoint already closed */
      }
      throw error;
    }
  });
  sqliteTxQueue = next.catch(() => {});
  return next;
}

export async function initializeWorkspace(db: PoolClient, tenant: string) {
  const sqlite = getSqliteStore(db);
  if (sqlite) return sqlite.initializeSalesWorkspace(tenant);
  await db.query("INSERT INTO sales_workspaces (id, name) VALUES ($1,$1) ON CONFLICT DO NOTHING", [tenant]);
  await db.query(`
    INSERT INTO sales_stages (tenant_id,id,name,position,kind)
    VALUES ($1,'new','New',0,'open'), ($1,'contacted','Contacted',1,'open'),
           ($1,'trial_booked','Booked',2,'open'), ($1,'paid','Won',3,'won'), ($1,'lost','Lost',4,'lost')
    ON CONFLICT DO NOTHING`, [tenant]);
}

export async function ingestMessage(tenant: string, message: InboundMessage): Promise<boolean> {
  if (!process.env.QEYDAI_DATABASE_URL) {
    const phone = normalizeAzPhone(message.sender);
    return workspaceTransaction(tenant, async (db) => {
      const sqlite = getSqliteStore(db);
      if (!sqlite) throw new Error("sqlite_store_unavailable");
      return sqlite.ingestSalesMessage(tenant, message, phone);
    });
  }
  const { channel, account, event, sender, name, text } = message;
  const connection = `${channel}:${account}`;
  const phone = normalizeAzPhone(sender);
  return workspaceTransaction(tenant, async (db) => {
    await initializeWorkspace(db, tenant);
    await db.query(`
      INSERT INTO sales_connections (tenant_id,id,channel,account)
      VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id,id) DO NOTHING`, [tenant, connection, channel, account]);
    const channelRow = await db.query<{ active: boolean }>(
      "SELECT active FROM sales_connections WHERE tenant_id=$1 AND id=$2", [tenant, connection],
    );
    if (!channelRow.rows[0]?.active) return false;

    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      JSON.stringify([tenant, phone ?? connection, phone ? null : sender]),
    ]);
    const seen = await db.query(
      "SELECT 1 FROM sales_messages WHERE tenant_id=$1 AND connection_id=$2 AND provider_event_id=$3",
      [tenant, connection, event],
    );
    if (seen.rows.length > 0 || (seen.rowCount ?? 0) > 0) return false;

    const existing = await db.query<{ id: string; contact_id: string; deal_id: string }>(`
      SELECT id, contact_id, deal_id FROM sales_threads
      WHERE tenant_id=$1 AND connection_id=$2 AND sender_id=$3`, [tenant, connection, sender]);
    const thread = existing.rows[0];

    let contactId = thread?.contact_id;
    if (!contactId && phone) {
      const byPhone = await db.query<{ id: string }>(
        "SELECT id FROM sales_contacts WHERE tenant_id=$1 AND phone=$2", [tenant, phone],
      );
      contactId = byPhone.rows[0]?.id;
    }
    if (!contactId) {
      const inserted = await db.query<{ id: string }>(`
        INSERT INTO sales_contacts (tenant_id,id,name,phone) VALUES ($1,$2,$3,$4)
        ON CONFLICT (tenant_id,phone) DO UPDATE SET phone=excluded.phone RETURNING id`,
      [tenant, randomUUID(), name, phone ?? null]);
      contactId = inserted.rows[0]?.id;
    }

    // Phone-based contact matching: flag unconfirmed matches for operator review.
    if (phone) {
      const confirmed = await db.query<{ confirmed: boolean }>(
        "SELECT confirmed FROM sales_phone_matches WHERE tenant_id=$1 AND normalized_phone=$2",
        [tenant, phone],
      );
      if (confirmed.rows.length === 0 || !confirmed.rows[0].confirmed) {
        await db.query(`
          INSERT INTO sales_phone_matches (tenant_id,id,contact_id,normalized_phone,channel,sender_id,confirmed)
          VALUES ($1,$2,$3,$4,$5,$6,false)
          ON CONFLICT (tenant_id, normalized_phone) DO UPDATE SET
            contact_id = COALESCE(sales_phone_matches.contact_id, excluded.contact_id)`,
          [tenant, randomUUID(), contactId, phone, channel, sender],
        );
      }
    }

    const open = await db.query<{ id: string }>(`
      SELECT d.id FROM sales_deals d JOIN sales_stages s ON (s.tenant_id,s.id)=(d.tenant_id,d.stage_id)
      WHERE d.tenant_id=$1 AND d.contact_id=$2 AND s.kind='open'
      ORDER BY (d.id=$3) DESC NULLS LAST, d.updated_at DESC, d.id LIMIT 1 FOR UPDATE OF d`,
    [tenant, contactId, thread?.deal_id ?? null]);
    let deal = open.rows[0]?.id;
    if (!deal) {
      deal = randomUUID();
      await db.query(`
        INSERT INTO sales_deals (tenant_id,id,contact_id,stage_id,title,source)
        VALUES ($1,$2,$3,(SELECT id FROM sales_stages WHERE tenant_id=$1 AND kind='open' ORDER BY position,id LIMIT 1),$4,$5)`,
      [tenant, deal, contactId, name, channel]);
    } else {
      await db.query("UPDATE sales_deals SET updated_at=now() WHERE tenant_id=$1 AND id=$2", [tenant, deal]);
    }

    const threadId = thread?.id ?? randomUUID();
    if (thread) {
      await db.query("UPDATE sales_threads SET deal_id=$3,last_inbound_at=now() WHERE tenant_id=$1 AND id=$2", [tenant, threadId, deal]);
    } else {
      await db.query(`
        INSERT INTO sales_threads (tenant_id,id,connection_id,contact_id,deal_id,channel,sender_id,last_inbound_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,now())`, [tenant, threadId, connection, contactId, deal, channel, sender]);
    }
    await db.query(`
      INSERT INTO sales_messages (tenant_id,id,thread_id,deal_id,connection_id,provider_event_id,direction,sender,body,status)
      VALUES ($1,$2,$3,$4,$5,$6,'in','student',$7,'received')`,
    [tenant, randomUUID(), threadId, deal, connection, event, text]);
    return true;
  });
}

