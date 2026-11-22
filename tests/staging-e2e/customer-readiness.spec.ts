import { expect, request as createRequest, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Runs only in the real-Neon staging workflow. Each context keeps its own
// authenticated cookie; no admin key is ever printed or committed.
const baseURL = "http://127.0.0.1:3100";
const tenants = [
  { id: process.env.STAGING_E2E_TENANT_A, key: process.env.STAGING_E2E_ADMIN_KEY_A },
  { id: process.env.STAGING_E2E_TENANT_B, key: process.env.STAGING_E2E_ADMIN_KEY_B },
];

test("business CRM: login, contacts, pipeline, tasks, notes, tenant isolation, logout", async ({ page }) => {
  for (const item of tenants) {
    expect(item.id).toBeTruthy();
    expect(item.key).toBeTruthy();
  }
  const a = await createRequest.newContext({ baseURL });
  const b = await createRequest.newContext({ baseURL });
  let contactId: string | undefined;
  let dealId: string | undefined;
  let taskId: string | undefined;
  let noteId: string | undefined;
  const suffix = randomUUID().slice(0, 12);
  try {
    // Reject unauthenticated requests; authenticate isolated business accounts.
    expect((await a.get("/api/panel/contacts")).status()).toBe(401);
    for (const [ctx, tenant] of [[a, tenants[0]], [b, tenants[1]]] as const) {
      const signIn = await ctx.post("/api/panel/auth", {
        data: { key: tenant.key },
        headers: { origin: baseURL },
      });
      expect(signIn.status()).toBe(200);
      expect((await signIn.json()).tenantId).toBe(tenant.id);
      expect((await ctx.get("/api/panel/auth")).status()).toBe(200);
    }

    // A new contact persists after readback and may be updated without losing data.
    const created = await a.post("/api/panel/contacts", {
      data: { name: "Staging Müştəri " + suffix },
      headers: { origin: baseURL },
    });
    expect(created.status()).toBe(201);
    contactId = (await created.json()).contact.id as string;
    const updated = await a.patch("/api/panel/contacts?id=" + encodeURIComponent(contactId), {
      data: { name: "Yenilənmiş Müştəri " + suffix },
      headers: { origin: baseURL },
    });
    expect(updated.status()).toBe(200);
    const readback = await a.get("/api/panel/contacts?id=" + encodeURIComponent(contactId));
    expect(readback.status()).toBe(200);
    expect((await readback.json()).contact.name).toBe("Yenilənmiş Müştəri " + suffix);

    // Tenant B cannot read or edit tenant A's contact or sales records.
    expect((await b.get("/api/panel/contacts?id=" + encodeURIComponent(contactId))).status()).toBe(404);
    expect((await b.patch("/api/panel/contacts?id=" + encodeURIComponent(contactId), {
      data: { name: "Forbidden" }, headers: { origin: baseURL },
    })).status()).toBe(404);

    const createdDeal = await a.post("/api/panel/deals", {
      data: { contactId, stageId: "new", title: "Staging satış " + suffix, source: "manual" },
      headers: { origin: baseURL },
    });
    expect(createdDeal.status()).toBe(201);
    dealId = (await createdDeal.json()).deal.id as string;
    expect((await b.patch("/api/panel/deals?id=" + encodeURIComponent(dealId), {
      data: { stageId: "contacted" }, headers: { origin: baseURL },
    })).status()).toBe(404);
    const advanced = await a.patch("/api/panel/deals?id=" + encodeURIComponent(dealId), {
      data: { stageId: "contacted" }, headers: { origin: baseURL },
    });
    expect(advanced.status()).toBe(200);
    expect((await advanced.json()).deal.stageId).toBe("contacted");

    const task = await a.post("/api/panel/tasks", {
      data: { dealId, title: "Staging tapşırıq " + suffix }, headers: { origin: baseURL },
    });
    expect(task.status()).toBe(201);
    taskId = (await task.json()).task.id as string;
    const note = await a.post("/api/panel/notes", {
      data: { dealId, body: "Staging qeyd " + suffix }, headers: { origin: baseURL },
    });
    expect(note.status()).toBe(201);
    noteId = (await note.json()).note.id as string;

    expect((await a.get("/api/panel/tasks?dealId=" + encodeURIComponent(dealId))).status()).toBe(200);
    expect((await a.get("/api/panel/notes?dealId=" + encodeURIComponent(dealId))).status()).toBe(200);
    expect((await b.get("/api/panel/tasks?dealId=" + encodeURIComponent(dealId))).status()).toBe(404);
    expect((await b.get("/api/panel/notes?dealId=" + encodeURIComponent(dealId))).status()).toBe(404);

    // A real browser must render the AZ interface on the same staging server.
    await page.goto("/az/login");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/az/register");
    await expect(page.locator("body")).toBeVisible();

    // Log out invalidates the same session even with the cookie still present.
    expect((await a.delete("/api/panel/auth", { headers: { origin: baseURL } })).status()).toBe(200);
    expect((await a.get("/api/panel/auth")).status()).toBe(401);
  } finally {
    // Delete in FK order. Never touch other tenants, even on partial test failure.
    const headers = { origin: baseURL };
    if (noteId) await a.delete("/api/panel/notes?id=" + encodeURIComponent(noteId), { headers }).catch(() => {});
    if (taskId) await a.delete("/api/panel/tasks?id=" + encodeURIComponent(taskId), { headers }).catch(() => {});
    if (dealId) await a.delete("/api/panel/deals?id=" + encodeURIComponent(dealId), { headers }).catch(() => {});
    if (contactId) await a.delete("/api/panel/contacts?id=" + encodeURIComponent(contactId), { headers }).catch(() => {});
    await a.dispose();
    await b.dispose();
  }
});
