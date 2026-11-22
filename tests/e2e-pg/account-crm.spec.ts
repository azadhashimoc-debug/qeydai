import { expect, test, request as apiRequest } from "@playwright/test";

const base = "http://127.0.0.1:3200";
test("business owner signs up, logs in with password, manages CRM, and remains tenant-isolated", async ({ page }) => {
  const id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  const email = "owner-" + id + "@example.test";
  const password = "Secure-Test-Password-" + id;
  const request = page.request;

  const registered = await request.post("/api/panel/account/register", {
    headers: { origin: base },
    data: { email, password, businessName: "Sınaq Biznesi " + id },
  });
  expect(registered.status()).toBe(200);
  const tenantId = (await registered.json()).tenantId;
  expect(tenantId).toMatch(/^biz_/);
  expect((await request.get("/api/panel/auth")).status()).toBe(200);
  const loggedOut = await request.delete("/api/panel/auth", { headers: { origin: base } });
  expect(loggedOut.status()).toBe(200);
  expect((await request.get("/api/panel/auth")).status()).toBe(401);

  await page.goto("/az/login");
  await expect(page.getByRole("button", { name: "E-poçt və şifrə" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Giriş açarı" })).toBeVisible();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="key"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/az\/panel/);
  expect((await request.get("/api/panel/auth")).status()).toBe(200);

  const created = await request.post("/api/panel/contacts", {
    headers: { origin: base }, data: { name: "Müştəri " + id, phone: "050 234 56 78" },
  });
  expect(created.status()).toBe(201);
  const contact = (await created.json()).contact;
  const changed = await request.patch("/api/panel/contacts?id=" + encodeURIComponent(contact.id), {
    headers: { origin: base }, data: { name: "Yenilənmiş müştəri " + id },
  });
  expect(changed.status()).toBe(200);
  const fetched = await request.get("/api/panel/contacts?id=" + encodeURIComponent(contact.id));
  expect(fetched.status()).toBe(200);
  expect((await fetched.json()).contact.name).toContain("Yenilənmiş");

  const madeDeal = await request.post("/api/panel/deals", {
    headers: { origin: base }, data: { contactId: contact.id, title: "Satış " + id, stageId: "new" },
  });
  expect(madeDeal.status()).toBe(201);
  const dealId = (await madeDeal.json()).deal.id;
  const moved = await request.patch("/api/panel/deals?id=" + encodeURIComponent(dealId), {
    headers: { origin: base }, data: { stageId: "contacted" },
  });
  expect(moved.status()).toBe(200);
  expect((await moved.json()).deal.stageId).toBe("contacted");

  const task = await request.post("/api/panel/tasks", {
    headers: { origin: base }, data: { dealId, title: "Müştəri ilə əlaqə saxla" },
  });
  expect(task.status()).toBe(201);
  const note = await request.post("/api/panel/notes", {
    headers: { origin: base }, data: { dealId, body: "Müştəri zəng gözləyir" },
  });
  expect(note.status()).toBe(201);
  expect((await (await request.get("/api/panel/tasks?dealId=" + dealId)).json()).tasks.length).toBeGreaterThan(0);
  expect((await (await request.get("/api/panel/notes?dealId=" + dealId)).json()).notes.length).toBeGreaterThan(0);

  await page.reload();
  expect((await request.get("/api/panel/auth")).status()).toBe(200);
  expect((await request.get("/api/panel/deals")).status()).toBe(200);

  const other = await apiRequest.newContext({ baseURL: base, extraHTTPHeaders: { origin: base } });
  try {
    const second = await other.post("/api/panel/account/register", {
      data: {
        email: "other-" + id + "@example.test", password: "Another-Strong-Password-" + id,
        businessName: "Digər Sınaq Biznesi",
      },
    });
    expect(second.status()).toBe(200);
    expect((await second.json()).tenantId).not.toBe(tenantId);
    const isolated = await other.get("/api/panel/contacts?id=" + contact.id);
    expect(isolated.status()).toBe(404);
    const forbiddenUpdate = await other.patch("/api/panel/contacts?id=" + contact.id, {
      data: { name: "Unauthorized edit" },
    });
    expect(forbiddenUpdate.status()).toBe(404);
  } finally {
    await other.dispose();
  }
  const finalRead = await request.get("/api/panel/contacts?id=" + contact.id);
  expect((await finalRead.json()).contact.name).toContain("Yenilənmiş");
});
