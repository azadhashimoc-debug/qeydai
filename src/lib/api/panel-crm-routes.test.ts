import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SqliteEnrollmentStore } from "@/lib/enrollment/sqlite-store";

let activeStore: SqliteEnrollmentStore;

vi.mock("@/lib/api/instance", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/instance")>("@/lib/api/instance");
  return {
    ...actual,
    getSharedStore: () => activeStore,
  };
});

import {
  adminKeyFingerprint,
  createPanelSessionToken,
  derivePanelSecret,
  PANEL_COOKIE_NAME,
} from "./panel-auth";
import { GET as contactsGet, POST as contactsPost } from "@/app/api/panel/contacts/route";
import { GET as dealsGet, POST as dealsPost, PATCH as dealsPatch, DELETE as dealsDelete } from "@/app/api/panel/deals/route";
import { POST as claimPost } from "@/app/api/panel/deals/[id]/claim/route";
import { GET as dealMsgsGet, POST as dealMsgsPost } from "@/app/api/panel/deals/[id]/messages/route";
import { GET as dealFieldsGet, PUT as dealFieldsPut } from "@/app/api/panel/deals/[id]/fields/route";
import { GET as timelineGet } from "@/app/api/panel/deals/[id]/timeline/route";
import { GET as stagesGet, POST as stagesPost, PATCH as stagesPatch, DELETE as stagesDelete } from "@/app/api/panel/stages/route";
import { GET as membersGet, POST as membersPost } from "@/app/api/panel/members/route";
import { GET as fieldsGet, POST as fieldsPost } from "@/app/api/panel/custom-fields/route";
import { GET as tasksGet, POST as tasksPost, PATCH as tasksPatch } from "@/app/api/panel/tasks/route";
import { GET as notesGet, POST as notesPost } from "@/app/api/panel/notes/route";
import { GET as matchesGet } from "@/app/api/panel/phone-matches/route";
import { POST as matchConfirmPost } from "@/app/api/panel/phone-matches/[id]/confirm/route";
import { GET as workspaceGet, PATCH as workspacePatch } from "@/app/api/panel/workspace/route";
import { DELETE as authDelete } from "@/app/api/panel/auth/route";
import { GET as legacySalesGet, POST as legacySalesPost } from "@/app/api/panel/sales/route";

const SECRET = "test-panel-crm-secret-0123456789abcdef";

function makeReq(
  urlPath: string,
  opts: { method?: string; cookie?: string; body?: unknown; origin?: string } = {},
): Request {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", opts.cookie);
  const method = opts.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    headers.set("origin", opts.origin ?? "http://localhost:3000");
  }
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers.set("content-type", "application/json");
    body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  }
  return new Request(`http://localhost:3000${urlPath}`, { method, headers, body });
}

const ALPHA_KEY = "admin-key-alpha-0123456789abcdef";
const BRAVO_KEY = "admin-key-bravo-0123456789abcdef";
const ADMIN_KEYS = {
  [ALPHA_KEY]: "tenant_alpha",
  [BRAVO_KEY]: "tenant_bravo",
};
const SIGNING_SECRET = derivePanelSecret(ADMIN_KEYS, SECRET)!;

function cookieFor(tenantId: string, memberId = ""): string {
  const key = tenantId === "tenant_bravo" ? BRAVO_KEY : ALPHA_KEY;
  const token = createPanelSessionToken(
    tenantId,
    SIGNING_SECRET,
    Date.now(),
    3600_000,
    adminKeyFingerprint(key),
    memberId || undefined,
  );
  return `${PANEL_COOKIE_NAME}=${token}`;
}

describe("Panel CRM RBAC & multi-tenant routes (/api/panel/*)", () => {
  let prevEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    prevEnv = {
      DATABASE_URL: process.env.DATABASE_URL,
      QEYDAI_PANEL_SECRET: process.env.QEYDAI_PANEL_SECRET,
      QEYDAI_ADMIN_KEYS: process.env.QEYDAI_ADMIN_KEYS,
    };
    delete process.env.DATABASE_URL;
    process.env.QEYDAI_PANEL_SECRET = SECRET;
    process.env.QEYDAI_ADMIN_KEYS = JSON.stringify(ADMIN_KEYS);

    activeStore = new SqliteEnrollmentStore(":memory:");
    activeStore.initializeSalesWorkspace("tenant_alpha");
    activeStore.initializeSalesWorkspace("tenant_bravo");
    await activeStore.createSalesMember("tenant_alpha", "mgr_1", "Manager One", "manager");
    await activeStore.createSalesMember("tenant_alpha", "op_1", "Operator One", "operator");
    await activeStore.createSalesMember("tenant_alpha", "op_2", "Operator Two", "operator");
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("enforces fail-closed auth, CSRF sameOrigin, and member existence", async () => {
    expect((await dealsGet(makeReq("/api/panel/deals"))).status).toBe(401);

    const ownerCookie = cookieFor("tenant_alpha");
    // Cross-origin CSRF blocked
    expect(
      (
        await contactsPost(
          makeReq("/api/panel/contacts", {
            method: "POST",
            cookie: ownerCookie,
            origin: "https://evil.example",
            body: { name: "Test", phone: "0501234567" },
          }),
        )
      ).status,
    ).toBe(403);

    // Non-existent memberId in token fails closed with 403
    const ghostCookie = cookieFor("tenant_alpha", "ghost_member");
    expect((await dealsGet(makeReq("/api/panel/deals", { cookie: ghostCookie }))).status).toBe(403);
  });

  it("enforces Owner vs Manager vs Operator RBAC across workspace, stages, members, deals, tasks, notes", async () => {
    const ownerCookie = cookieFor("tenant_alpha");
    const mgrCookie = cookieFor("tenant_alpha", "mgr_1");
    const op1Cookie = cookieFor("tenant_alpha", "op_1");
    const op2Cookie = cookieFor("tenant_alpha", "op_2");

    // Workspace PATCH: only owner allowed
    expect(
      (
        await workspacePatch(
          makeReq("/api/panel/workspace", {
            method: "PATCH",
            cookie: mgrCookie,
            body: { name: "Blocked" },
          }),
        )
      ).status,
    ).toBe(403);
    const wsOk = await workspacePatch(
      makeReq("/api/panel/workspace", {
        method: "PATCH",
        cookie: ownerCookie,
        body: { name: "Alpha Updated", currency: "USD" },
      }),
    );
    expect(wsOk.status).toBe(200);
    expect((await workspaceGet(makeReq("/api/panel/workspace", { cookie: op1Cookie }))).status).toBe(200);

    // Members: manager cannot create owner; operator sees only self
    expect(
      (
        await membersPost(
          makeReq("/api/panel/members", {
            method: "POST",
            cookie: mgrCookie,
            body: { id: "new_owner", name: "Rogue Owner", role: "owner" },
          }),
        )
      ).status,
    ).toBe(403);
    const opMembersRes = await membersGet(makeReq("/api/panel/members", { cookie: op1Cookie }));
    expect(opMembersRes.status).toBe(200);
    const opMembersJson = (await opMembersRes.json()) as { members: Array<{ id: string }> };
    expect(opMembersJson.members.map((m) => m.id)).toEqual(["op_1"]);

    // Stages & custom fields: operator blocked from mutations (403); manager allowed
    expect(
      (
        await stagesPost(
          makeReq("/api/panel/stages", {
            method: "POST",
            cookie: op1Cookie,
            body: { name: "Blocked Stage" },
          }),
        )
      ).status,
    ).toBe(403);
    const stageOk = await stagesPost(
      makeReq("/api/panel/stages", {
        method: "POST",
        cookie: mgrCookie,
        body: { name: "Follow-up" },
      }),
    );
    expect(stageOk.status).toBe(201);
    const { stage: createdStage } = (await stageOk.json()) as { stage: { id: string; name: string } };
    const stageRenamed = await stagesPatch(
      makeReq(`/api/panel/stages?id=${createdStage.id}`, {
        method: "PATCH",
        cookie: mgrCookie,
        body: { name: "Follow-up Call" },
      }),
    );
    expect(stageRenamed.status).toBe(200);
    const stageRenamedJson = (await stageRenamed.json()) as { stage: { name: string } };
    expect(stageRenamedJson.stage.name).toBe("Follow-up Call");
    expect((await stagesGet(makeReq("/api/panel/stages", { cookie: op1Cookie }))).status).toBe(200);

    expect(
      (
        await fieldsPost(
          makeReq("/api/panel/custom-fields", {
            method: "POST",
            cookie: op1Cookie,
            body: { name: "Blocked Field", kind: "text" },
          }),
        )
      ).status,
    ).toBe(403);
    const fieldOk = await fieldsPost(
      makeReq("/api/panel/custom-fields", {
        method: "POST",
        cookie: mgrCookie,
        body: { name: "Target Score", kind: "number", required: true },
      }),
    );
    expect(fieldOk.status).toBe(201);
    const { def: createdField } = (await fieldOk.json()) as { def: { id: string } };
    expect((await fieldsGet(makeReq("/api/panel/custom-fields", { cookie: op1Cookie }))).status).toBe(200);

    // Contacts: operator cannot create; manager creates contact with canonical phone
    expect(
      (
        await contactsPost(
          makeReq("/api/panel/contacts", {
            method: "POST",
            cookie: op1Cookie,
            body: { name: "Test", phone: "0501234567" },
          }),
        )
      ).status,
    ).toBe(403);
    const cRes = await contactsPost(
      makeReq("/api/panel/contacts", {
        method: "POST",
        cookie: mgrCookie,
        body: { name: "Leyla", phone: "050 123 45 67" },
      }),
    );
    expect(cRes.status).toBe(201);
    const { contact } = (await cRes.json()) as { contact: { id: string; phone: string } };
    expect(contact.phone).toBe("+994501234567");
    expect((await contactsGet(makeReq("/api/panel/contacts", { cookie: op1Cookie }))).status).toBe(200);

    // Manager creates unassigned deal
    const dRes = await dealsPost(
      makeReq("/api/panel/deals", {
        method: "POST",
        cookie: mgrCookie,
        body: { title: "IELTS Weekend", contactId: contact.id, amountMinor: 15000 },
      }),
    );
    expect(dRes.status).toBe(201);
    const { deal } = (await dRes.json()) as { deal: { id: string; assigneeId: string | null } };
    expect(deal.assigneeId).toBeNull();

    // Operator 1 claims deal; Operator 2 gets 409 conflict and cannot view/edit/task/note it
    const claim1 = await claimPost(
      makeReq(`/api/panel/deals/${deal.id}/claim`, { method: "POST", cookie: op1Cookie }),
      { params: Promise.resolve({ id: deal.id }) },
    );
    expect(claim1.status).toBe(200);

    const claim2 = await claimPost(
      makeReq(`/api/panel/deals/${deal.id}/claim`, { method: "POST", cookie: op2Cookie }),
      { params: Promise.resolve({ id: deal.id }) },
    );
    expect(claim2.status).toBe(409);

    const op2Deals = (await (await dealsGet(makeReq("/api/panel/deals", { cookie: op2Cookie }))).json()) as {
      deals: Array<{ id: string }>;
    };
    expect(op2Deals.deals.some((x) => x.id === deal.id)).toBe(false);

    expect(
      (
        await dealsPatch(
          makeReq(`/api/panel/deals?id=${deal.id}`, {
            method: "PATCH",
            cookie: op2Cookie,
            body: { stageId: createdStage.id },
          }),
        )
      ).status,
    ).toBe(403);

    // Operator 1 cannot reassign or delete another operator's/unassigned check, wait: op1 cannot reassign to op_2
    expect(
      (
        await dealsPatch(
          makeReq(`/api/panel/deals?id=${deal.id}`, {
            method: "PATCH",
            cookie: op1Cookie,
            body: { assigneeId: "op_2" },
          }),
        )
      ).status,
    ).toBe(403);

    // Operator 2 cannot delete Operator 1's deal
    expect(
      (
        await dealsDelete(
          makeReq(`/api/panel/deals?id=${deal.id}`, { method: "DELETE", cookie: op2Cookie }),
        )
      ).status,
    ).toBe(403);

    expect(
      (
        await dealsPatch(
          makeReq(`/api/panel/deals?id=${deal.id}`, {
            method: "PATCH",
            cookie: op1Cookie,
            body: { stageId: createdStage.id },
          }),
        )
      ).status,
    ).toBe(200);

    // Cannot delete in-use stage -> 409
    expect(
      (await stagesDelete(makeReq(`/api/panel/stages?id=${createdStage.id}`, { method: "DELETE", cookie: mgrCookie })))
        .status,
    ).toBe(409);

    // Tasks, notes, custom field values, timeline
    const taskRes = await tasksPost(
      makeReq("/api/panel/tasks", {
        method: "POST",
        cookie: op1Cookie,
        body: { dealId: deal.id, title: "Call student" },
      }),
    );
    expect(taskRes.status).toBe(201);
    const { task } = (await taskRes.json()) as { task: { id: string } };
    expect(
      (
        await tasksPatch(
          makeReq(`/api/panel/tasks?id=${task.id}`, {
            method: "PATCH",
            cookie: op1Cookie,
            body: { status: "done" },
          }),
        )
      ).status,
    ).toBe(200);
    expect((await tasksGet(makeReq(`/api/panel/tasks?dealId=${deal.id}`, { cookie: op2Cookie }))).status).toBe(403);

    expect(
      (
        await notesPost(
          makeReq("/api/panel/notes", {
            method: "POST",
            cookie: op1Cookie,
            body: { dealId: deal.id, body: "Ready for Saturday slot" },
          }),
        )
      ).status,
    ).toBe(201);
    expect((await notesGet(makeReq(`/api/panel/notes?dealId=${deal.id}`, { cookie: op2Cookie }))).status).toBe(403);

    expect(
      (
        await dealFieldsPut(
          makeReq(`/api/panel/deals/${deal.id}/fields`, {
            method: "PUT",
            cookie: op1Cookie,
            body: { values: [{ fieldId: createdField.id, value: "7.0" }] },
          }),
          { params: Promise.resolve({ id: deal.id }) },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await dealFieldsGet(makeReq(`/api/panel/deals/${deal.id}/fields`, { cookie: op1Cookie }), {
          params: Promise.resolve({ id: deal.id }),
        })
      ).status,
    ).toBe(200);

    const tlRes = await timelineGet(makeReq(`/api/panel/deals/${deal.id}/timeline`, { cookie: op1Cookie }), {
      params: Promise.resolve({ id: deal.id }),
    });
    expect(tlRes.status).toBe(200);
    const tlJson = (await tlRes.json()) as { timeline: Array<{ kind: string; eventType?: string }> };
    expect(tlJson.timeline.some((e) => e.kind === "event" && e.eventType === "stage_changed")).toBe(true);

    // Cross-tenant isolation: tenant_bravo owner gets 404 on tenant_alpha deal
    const bravoCookie = cookieFor("tenant_bravo");
    expect(
      (
        await dealMsgsGet(makeReq(`/api/panel/deals/${deal.id}/messages`, { cookie: bravoCookie }), {
          params: Promise.resolve({ id: deal.id }),
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await dealMsgsPost(
          makeReq(`/api/panel/deals/${deal.id}/messages`, {
            method: "POST",
            cookie: bravoCookie,
            body: { body: "cross-tenant" },
          }),
          { params: Promise.resolve({ id: deal.id }) },
        )
      ).status,
    ).toBe(404);
  });

  it("confirms unconfirmed phone matches via /api/panel/phone-matches/[id]/confirm and enforces tenant isolation", async () => {
    const accepted = activeStore.ingestSalesMessage(
      "tenant_alpha",
      {
        channel: "instagram",
        account: "ig_acc",
        event: "ig_msg_1",
        sender: "ig_user_99",
        name: "Nigar",
        text: "Salam 051 222 33 44",
      },
      "+994512223344",
    );
    expect(accepted).toBe(true);

    const deals = await activeStore.listSalesDeals("tenant_alpha");
    const igDeal = deals.find((d) => d.source === "instagram");
    expect(igDeal).toBeDefined();

    const alphaOwner = cookieFor("tenant_alpha");
    const bravoOwner = cookieFor("tenant_bravo");
    const opCookie = cookieFor("tenant_alpha", "op_1");

    const listRes = await matchesGet(makeReq("/api/panel/phone-matches", { cookie: alphaOwner }));
    expect(listRes.status).toBe(200);
    const { matches } = (await listRes.json()) as {
      matches: Array<{ id: string; contactName: string; phoneNormalized: string }>;
    };
    expect(matches.length).toBe(1);
    expect(matches[0].contactName).toBe("Nigar");
    expect(matches[0].phoneNormalized).toBe("+994512223344");

    // Cross-tenant bravo cannot confirm (404)
    expect(
      (
        await matchConfirmPost(
          makeReq(`/api/panel/phone-matches/${matches[0].id}/confirm`, { method: "POST", cookie: bravoOwner }),
          { params: Promise.resolve({ id: matches[0].id }) },
        )
      ).status,
    ).toBe(404);

    // Operator confirms phone match (allowed by design)
    const okRes = await matchConfirmPost(
      makeReq(`/api/panel/phone-matches/${matches[0].id}/confirm`, { method: "POST", cookie: opCookie }),
      { params: Promise.resolve({ id: matches[0].id }) },
    );
    expect(okRes.status).toBe(200);
    const okJson = (await okRes.json()) as { match: { id: string; contactId: string; confirmedAt: string } };
    expect(okJson.match.id).toBe(matches[0].id);
    expect(okJson.match.contactId).toBeTruthy();

    // Deal reply works over instagram inside 24h window
    const replyRes = await dealMsgsPost(
      makeReq(`/api/panel/deals/${igDeal!.id}/messages`, {
        method: "POST",
        cookie: alphaOwner,
        body: { body: "Salam Nigar xanim!" },
      }),
      { params: Promise.resolve({ id: igDeal!.id }) },
    );
    expect(replyRes.status).toBe(201);
  });

  it("allows env-key owner claim without memberId, revokes jti on logout across CRM, scopes contacts/phone-matches, and disables /api/panel/sales", async () => {
    const ownerCookie = cookieFor("tenant_alpha");
    const op1Cookie = cookieFor("tenant_alpha", "op_1");
    const op2Cookie = cookieFor("tenant_alpha", "op_2");

    // 1. Legacy /api/panel/sales returns 410 Gone
    expect((await legacySalesGet()).status).toBe(410);
    expect((await legacySalesPost()).status).toBe(410);

    // 2. Env-key owner (memberId === "") claims unassigned deal without body
    const c1Res = await contactsPost(
      makeReq("/api/panel/contacts", {
        method: "POST",
        cookie: ownerCookie,
        body: { name: "Owner Claim Contact", phone: "+994503334455" },
      }),
    );
    expect(c1Res.status).toBe(201);
    const { contact: c1 } = (await c1Res.json()) as { contact: { id: string } };

    const d1Res = await dealsPost(
      makeReq("/api/panel/deals", {
        method: "POST",
        cookie: ownerCookie,
        body: { contactId: c1.id, title: "Owner Claim Deal" },
      }),
    );
    expect(d1Res.status).toBe(201);
    const { deal: d1 } = (await d1Res.json()) as { deal: { id: string } };

    const ownerClaimRes = await claimPost(
      makeReq(`/api/panel/deals/${d1.id}/claim`, { method: "POST", cookie: ownerCookie }),
      { params: Promise.resolve({ id: d1.id }) },
    );
    expect(ownerClaimRes.status).toBe(200);
    const { deal: claimedByOwner } = (await ownerClaimRes.json()) as { deal: { assigneeId: string | null } };
    expect(claimedByOwner.assigneeId).toBe("owner");

    // Second claim conflicts with 409
    expect(
      (
        await claimPost(makeReq(`/api/panel/deals/${d1.id}/claim`, { method: "POST", cookie: op1Cookie }), {
          params: Promise.resolve({ id: d1.id }),
        })
      ).status,
    ).toBe(409);

    // 3. Operator scoping on contacts & phone-matches: op_1's exclusive contact + phone match is hidden from op_2
    activeStore.ingestSalesMessage(
      "tenant_alpha",
      {
        channel: "instagram",
        account: "ig_acc",
        event: "ig_scoped_1",
        sender: "ig_scoped_user",
        name: "Kamran",
        text: "055 777 88 99",
      },
      "+994557778899",
    );
    const allDeals = await activeStore.listSalesDeals("tenant_alpha");
    const scopedDeal = allDeals.find((d) => d.contactName === "Kamran")!;
    expect(scopedDeal).toBeDefined();

    // op_1 claims Kamran's deal
    expect(
      (
        await claimPost(makeReq(`/api/panel/deals/${scopedDeal.id}/claim`, { method: "POST", cookie: op1Cookie }), {
          params: Promise.resolve({ id: scopedDeal.id }),
        })
      ).status,
    ).toBe(200);

    // op_2 cannot list Kamran in contacts or fetch ?id=Kamran's contactId
    const op2ContactsRes = await contactsGet(makeReq("/api/panel/contacts", { cookie: op2Cookie }));
    expect(op2ContactsRes.status).toBe(200);
    const { contacts: op2Contacts } = (await op2ContactsRes.json()) as { contacts: Array<{ id: string }> };
    expect(op2Contacts.some((c) => c.id === scopedDeal.contactId)).toBe(false);

    expect(
      (await contactsGet(makeReq(`/api/panel/contacts?id=${scopedDeal.contactId}`, { cookie: op2Cookie }))).status,
    ).toBe(403);

    // op_2 cannot see or confirm Kamran's phone match
    const op2MatchesRes = await matchesGet(makeReq("/api/panel/phone-matches", { cookie: op2Cookie }));
    expect(op2MatchesRes.status).toBe(200);
    const { matches: op2Matches } = (await op2MatchesRes.json()) as { matches: Array<{ contactId: string }> };
    expect(op2Matches.some((m) => m.contactId === scopedDeal.contactId)).toBe(false);

    const ownerMatchesRes = await matchesGet(makeReq("/api/panel/phone-matches", { cookie: ownerCookie }));
    const { matches: ownerMatches } = (await ownerMatchesRes.json()) as {
      matches: Array<{ id: string; contactId: string }>;
    };
    const scopedMatch = ownerMatches.find((m) => m.contactId === scopedDeal.contactId)!;
    expect(scopedMatch).toBeDefined();

    expect(
      (
        await matchConfirmPost(
          makeReq(`/api/panel/phone-matches/${scopedMatch.id}/confirm`, { method: "POST", cookie: op2Cookie }),
          { params: Promise.resolve({ id: scopedMatch.id }) },
        )
      ).status,
    ).toBe(403);

    // 4. Logout via DELETE /api/panel/auth revokes jti for CRM routes too
    const logoutRes = await authDelete(makeReq("/api/panel/auth", { method: "DELETE", cookie: op1Cookie }));
    expect(logoutRes.status).toBe(200);
    expect((await dealsGet(makeReq("/api/panel/deals", { cookie: op1Cookie }))).status).toBe(401);
  });
});
