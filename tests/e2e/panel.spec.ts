import { expect, test, type Page } from "@playwright/test";
import { completeWorkspaceSetup } from "./workspace-setup";
import { E2E_ADMIN_KEYS, E2E_BASE_URL, E2E_KEYS } from "../../playwright.config";

type ProjectName = "desktop" | "mobile";

const FUTURE_ISO = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

function futureLocalDatetime(daysAhead = 7): string {
  const d = new Date(Date.now() + daysAhead * 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let idSeq = 0;
function makeUid(project: ProjectName): string {
  idSeq += 1;
  return `${project}-${Date.now().toString(36)}-${idSeq}-${Math.random().toString(36).slice(2, 6)}`;
}

let phoneSeq = 0;
function makePhone(project: ProjectName, workerIndex: number): string {
  phoneSeq = (phoneSeq + 1) % 100;
  const projDigit = project === "desktop" ? "1" : "2";
  const workerDigit = String(workerIndex % 10);
  const seqDigits = String(phoneSeq).padStart(2, "0");
  const randDigits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  // Uses 077 prefix with project/worker/sequence partitions so concurrent tests never collide.
  return `+99477${projDigit}${workerDigit}${seqDigits}${randDigits}`;
}

async function signInToPanel(page: Page, project: ProjectName): Promise<void> {
  // The current panel redirects unauthenticated visitors to the standalone login.
  await page.goto("/en/login");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByLabel("Email").fill("pilot@example.test");
  await page.getByLabel("Workspace access key").fill(E2E_ADMIN_KEYS[project]);
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  await completeWorkspaceSetup(page);
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
}

test("settings keep profile edits, real workspace views, and a contained notification table", async ({ page }, info) => {
  await signInToPanel(page, info.project.name as ProjectName);
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Profile settings" })).toBeVisible();
  await page.getByRole("textbox", { name: "Note" }).fill("Local settings note");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved in this browser.");
  await page.getByRole("button", { name: "User management" }).click();
  await expect(page.getByLabel("Member ID")).toBeVisible();
  await expect(page.getByLabel("Workspace name")).toHaveCount(0);
  await page.getByRole("button", { name: "Workspace settings" }).click();
  await expect(page.getByLabel("Workspace name")).toBeVisible();
  await expect(page.getByLabel("Member ID")).toHaveCount(0);
  await page.goto("/en/panel?tab=settings");
  await expect(page.getByRole("textbox", { name: "Note" })).toHaveValue("Local settings note");
  await expect(page.getByRole("table", { name: "Advanced settings" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});

test("channel copying, AI previews, and localized plan contact links", async ({ page, context }, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signInToPanel(page, info.project.name as ProjectName);

  await page.getByRole("tab", { name: "Channels" }).click();
  await page.getByRole("button", { name: "Webhook URL" }).first().click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toBe("");

  await page.getByRole("tab", { name: "Pani", exact: true }).click();
  const preview = page.getByRole("button", { name: "Open", exact: true }).first();
  await preview.click();
  await expect(page.getByRole("button", { name: "Close", exact: true })).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("tab", { name: "Plans" }).click();
  await expect(page.getByText("Starter", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Monthly", exact: true }).check();
  await expect(page.getByText("100 AZN", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request pilot" }).first()).toHaveAttribute("href", "/en#contact");
});

test("SEO noindex, unauthenticated 401, invalid key rejection, and session persistence across reload", async ({
  page,
  request,
}, info) => {
  const project = info.project.name as ProjectName;

  const unauthRes = await request.get("/api/panel/overview");
  expect(unauthRes.status()).toBe(401);
  expect(unauthRes.headers()["cache-control"]).toBe("no-store");

  await page.goto("/en/panel");
  await expect(page).toHaveURL(/\/en\/login$/);
  const robotsMeta = page.locator('meta[name="robots"]');
  await expect(robotsMeta).toHaveAttribute("content", /noindex/i);
  await expect(robotsMeta).toHaveAttribute("content", /nofollow/i);

  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();

  await page.getByLabel("Email").fill("pilot@example.test");
  await page.getByLabel("Workspace access key").fill("invalid-panel-key-0123456789abcdef");
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  await expect(page.getByRole("status")).toHaveText("Invalid access key. Check the key and try again.");
  await expect(page.getByLabel("Workspace access key")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();

  const authPromise = page.waitForResponse(
    (res) => res.url().includes("/api/panel/auth") && res.request().method() === "POST",
  );
  await page.getByLabel("Email").fill("pilot@example.test");
  await page.getByLabel("Workspace access key").fill(E2E_ADMIN_KEYS[project]);
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  const authRes = await authPromise;
  expect(authRes.status()).toBe(200);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === "qeydai_panel" && c.httpOnly)).toBe(true);

  await completeWorkspaceSetup(page);
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
  if (project === "desktop") {
    await expect(page.getByText(`Business: e2e-${project}`)).toBeVisible();
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toHaveCount(0);
});

test("tenant isolation: panel hides and refuses PATCH for another tenant's lead", async ({
  page,
  request,
}, info) => {
  const project = info.project.name as ProjectName;
  const other: ProjectName = project === "desktop" ? "mobile" : "desktop";
  const uid = makeUid(project);
  const otherLeadName = `Isolated ${uid}`;
  const otherLeadPhone = makePhone(other, info.workerIndex);

  const seedRes = await request.post("/api/v1/leads", {
    headers: { authorization: `Bearer ${E2E_KEYS[other]}`, "content-type": "application/json" },
    data: { name: otherLeadName, phone: otherLeadPhone, source: "telegram", note: `secret-${uid}` },
  });
  expect(seedRes.status()).toBe(201);
  const { leadId: otherLeadId } = (await seedRes.json()) as { ok: true; leadId: string };

  await signInToPanel(page, project);
  await page.getByRole("tab", { name: /CRM/ }).click();
  await expect(page.getByRole("heading", { name: "Lead register (CRM)" })).toBeVisible();

  await expect(page.getByText(otherLeadName)).toHaveCount(0);
  await page.getByLabel("Search").fill(otherLeadName);
  await expect(page.getByText(otherLeadName)).toHaveCount(0);

  const listRes = await page.request.get("/api/panel/leads");
  expect(listRes.status()).toBe(200);
  const listJson = (await listRes.json()) as { ok: true; leads: Array<{ id: string }> };
  expect(listJson.leads.some((l) => l.id === otherLeadId)).toBe(false);

  const patchRes = await page.request.patch(`/api/panel/leads/${encodeURIComponent(otherLeadId)}`, {
    headers: { origin: E2E_BASE_URL, "content-type": "application/json" },
    data: { stage: "contacted" },
  });
  expect(patchRes.status()).toBe(404);
});

test("sessions tab: create session in UI, enroll via M2M API, and view student roster", async ({
  page,
  request,
}, info) => {
  const project = info.project.name as ProjectName;
  const uid = makeUid(project);
  const sessionId = `s-ui-${uid}`;
  const courseId = `IELTS-${uid.slice(-6)}`;
  const studentName = `Aygün ${uid.slice(-5)}`;
  const studentPhone = makePhone(project, info.workerIndex);

  await signInToPanel(page, project);
  await page.getByRole("tab", { name: /Bookings/ }).click();
  await expect(page.getByRole("heading", { name: "Appointments and booking calendar" })).toBeVisible();

  await page.getByLabel("Session ID").fill(sessionId);
  await page.getByLabel("Service name").fill(courseId);
  await page.getByLabel("Start date and time").fill(futureLocalDatetime(7));
  await page.getByLabel("Seat capacity").fill("4");
  await page.getByRole("button", { name: "Create booking slot" }).click();

  await expect(page.getByText("Booking slot was added to the calendar.")).toBeVisible();

  const sessionItem = page.locator("li", { hasText: sessionId });
  await expect(sessionItem).toBeVisible();
  await expect(sessionItem).toContainText(courseId);
  await expect(sessionItem).toContainText("0/4 taken");
  await expect(sessionItem).toContainText("4 seats left");
  await expect(sessionItem.getByRole("button", { name: /Show roster \(0\)/ })).toBeVisible();

  const enrollRes = await request.post("/api/v1/enroll", {
    headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
    data: { sessionId, name: studentName, phone: studentPhone },
  });
  expect(enrollRes.status()).toBe(201);

  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(sessionItem).toContainText("1/4 taken");
  await expect(sessionItem).toContainText("3 seats left");

  const showRosterBtn = sessionItem.getByRole("button", { name: /Show roster \(1\)/ });
  await expect(showRosterBtn).toBeVisible();
  await showRosterBtn.click();

  await expect(sessionItem.getByRole("button", { name: /Hide roster \(1\)/ })).toBeVisible();
  await expect(sessionItem).toContainText(studentName);
  await expect(sessionItem).toContainText(studentPhone);
});

test("CRM leads pipeline: create lead, update stage and note, filter, and persist across reload", async ({
  page,
}, info) => {
  const project = info.project.name as ProjectName;
  const uid = makeUid(project);
  const leadName = `Leyla ${uid}`;
  const leadPhone = makePhone(project, info.workerIndex);
  const initialNote = `Interested in IELTS ${uid}`;
  const updatedNote = `Booked Saturday 11:00 trial (${uid})`;

  await signInToPanel(page, project);
  await page.getByRole("tab", { name: /CRM/ }).click();
  await expect(page.getByRole("heading", { name: "Lead register (CRM)" })).toBeVisible();

  await page.getByRole("button", { name: "New lead" }).click();
  const createSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Add a new lead" }),
  });
  await expect(createSection).toBeVisible();

  await createSection.getByLabel("Full name").fill(leadName);
  await createSection.getByLabel("Phone number").fill(leadPhone);
  await createSection.getByLabel("Source channel").selectOption("whatsapp");
  await createSection.getByLabel("Stage").selectOption("contacted");
  await createSection.getByLabel("Note").fill(initialNote);
  await createSection.getByRole("button", { name: "Save lead" }).click();

  await expect(createSection.getByRole("status")).toHaveText("Lead added to the register.");

  const leadCard = page.locator("li", { hasText: leadName });
  await expect(leadCard).toBeVisible();
  await expect(leadCard).toContainText(leadPhone);
  await expect(leadCard).toContainText("WhatsApp");
  await expect(leadCard).toContainText("Contacted");

  await leadCard.getByLabel("Change lead stage").selectOption("trial_booked");
  await expect(leadCard.getByRole("status")).toHaveText("Changes saved.");
  await expect(leadCard.getByLabel("Change lead stage")).toHaveValue("trial_booked");

  await leadCard.getByLabel("Note").fill(updatedNote);
  await leadCard.getByRole("button", { name: "Save note" }).click();
  await expect(leadCard.getByRole("button", { name: "Save note" })).toBeDisabled();
  await expect(leadCard.getByRole("status")).toHaveText("Changes saved.");

  await page.getByLabel("Filter by stage").selectOption("lost");
  await expect(leadCard).toHaveCount(0);

  await page.getByLabel("Filter by stage").selectOption("trial_booked");
  await page.getByLabel("Search").fill(leadName);
  await expect(leadCard).toBeVisible();

  await page.getByLabel("Search").fill(`missing-${uid}`);
  await expect(leadCard).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
  await page.getByRole("tab", { name: /CRM/ }).click();

  await page.getByLabel("Search").fill(leadName);
  await expect(leadCard).toBeVisible();
  await expect(leadCard.getByLabel("Change lead stage")).toHaveValue("trial_booked");
  await expect(leadCard.getByLabel("Note")).toHaveValue(updatedNote);
});

test("unified inbox: staff reply, simulated student message, M2M AI sync, order and mobile threads", async ({
  page,
  request,
}, info) => {
  const project = info.project.name as ProjectName;
  const uid = makeUid(project);
  const leadName = `Murad ${uid}`;
  const leadPhone = makePhone(project, info.workerIndex);

  const seedRes = await request.post("/api/v1/leads", {
    headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
    data: { name: leadName, phone: leadPhone, source: "telegram" },
  });
  expect(seedRes.status()).toBe(201);
  const { leadId } = (await seedRes.json()) as { ok: true; leadId: string };

  await signInToPanel(page, project);
  await page.getByRole("tab", { name: /CRM/ }).click();
  await page.getByLabel("Search").fill(leadName);

  const leadCard = page.locator("li", { hasText: leadName });
  await expect(leadCard).toBeVisible();
  await leadCard.getByRole("button", { name: "Open in Inbox" }).click();

  await expect(page.getByRole("tab", { name: /Inbox/ })).toHaveAttribute("aria-selected", "true");
  const convSection = page.getByRole("region", { name: leadName });
  await expect(convSection).toBeVisible();
  await expect(convSection.getByText("No messages with this lead yet. Send the first message below.")).toBeVisible();

  if (project === "mobile") {
    await convSection.getByRole("button", { name: /All threads/ }).click();
    const mobileThreads = page.getByRole("complementary", { name: "Threads" });
    await expect(mobileThreads).toBeVisible();
    await mobileThreads.getByPlaceholder("Type name or phone").fill(leadName);
    await mobileThreads.getByRole("button", { name: new RegExp(leadName) }).click();
    await expect(convSection).toBeVisible();
  }

  const staffMsg = `1-Staff: Salam ${uid}`;
  await expect(convSection.getByRole("button", { name: "Staff reply" })).toHaveAttribute("aria-pressed", "true");
  await convSection.getByLabel("Message").fill(staffMsg);
  await convSection.getByRole("button", { name: "Send" }).click();
  await expect(convSection.locator("article", { hasText: staffMsg })).toBeVisible();

  const studentMsg = `2-Student: Qiymət nə qədərdir? ${uid}`;
  await convSection.getByRole("button", { name: "Customer message (test)" }).click();
  await expect(convSection.getByRole("button", { name: "Customer message (test)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await convSection.getByLabel("Message").fill(studentMsg);
  await convSection.getByRole("button", { name: "Send" }).click();
  await expect(convSection.locator("article", { hasText: studentMsg })).toBeVisible();

  const aiMsg = `3-AI: IELTS 180 AZN, şənbə 11:00 sınaq dərsi var. ${uid}`;
  const aiRes = await request.post("/api/v1/messages", {
    headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
    data: { leadId, body: aiMsg, sender: "ai", direction: "out", channel: "telegram" },
  });
  expect(aiRes.status()).toBe(201);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
  await page.getByRole("tab", { name: /Inbox/ }).click();

  const threadsAside = page.getByRole("complementary", { name: "Threads" });
  await expect(threadsAside).toBeVisible();
  await threadsAside.getByPlaceholder("Type name or phone").fill(leadName);
  await threadsAside.getByRole("button", { name: new RegExp(leadName) }).click();

  const reloadedConv = page.getByRole("region", { name: leadName });
  await expect(reloadedConv).toBeVisible();

  const messages = reloadedConv.locator("article");
  await expect(messages).toHaveCount(3);
  await expect(messages.nth(0)).toContainText("Staff");
  await expect(messages.nth(0)).toContainText(staffMsg);
  await expect(messages.nth(1)).toContainText("Student");
  await expect(messages.nth(1)).toContainText(studentMsg);
  await expect(messages.nth(2)).toContainText("AI assistant");
  await expect(messages.nth(2)).toContainText(aiMsg);
});

test("overview analytics, KPI cards, funnel sections, and zero horizontal overflow in light and dark mode", async ({
  page,
  request,
}, info) => {
  const project = info.project.name as ProjectName;
  const uid = makeUid(project);
  const sesId = `s-ov-${uid}`;
  const phone = makePhone(project, info.workerIndex);

  expect(
    (
      await request.post("/api/v1/sessions", {
        headers: { authorization: `Bearer ${E2E_ADMIN_KEYS[project]}`, "content-type": "application/json" },
        data: { id: sesId, courseId: "Math", startsAt: FUTURE_ISO, capacity: 5 },
      })
    ).status(),
  ).toBe(201);

  expect(
    (
      await request.post("/api/v1/enroll", {
        headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
        data: { sessionId: sesId, name: `OV ${uid}`, phone },
      })
    ).status(),
  ).toBe(201);

  const leadRes = await request.post("/api/v1/leads", {
    headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
    data: { name: `OV Lead ${uid}`, phone, source: "web", stage: "paid" },
  });
  expect(leadRes.status()).toBe(201);
  const { leadId } = (await leadRes.json()) as { ok: true; leadId: string };

  expect(
    (
      await request.post("/api/v1/messages", {
        headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
        data: { leadId, body: `Overview ping ${uid}`, sender: "student", direction: "in", channel: "web" },
      })
    ).status(),
  ).toBe(201);

  const pageErrors: Error[] = [];
  page.on("pageerror", (err) => pageErrors.push(err));

  await signInToPanel(page, project);
  await page.getByRole("tab", { name: /Bookings/ }).click();
  await page.getByRole("tab", { name: /Overview/ }).click();

  const kpiSection = page.getByRole("region", { name: "Today at a glance" });
  await expect(kpiSection.getByText("Total leads")).toBeVisible();
  await expect(kpiSection.getByText("Confirmed bookings")).toBeVisible();
  await expect(kpiSection.getByText("Paying customers")).toBeVisible();
  await expect(kpiSection.getByText("Total messages")).toBeVisible();

  const kpiCards = kpiSection.locator("article");
  await expect(kpiCards).toHaveCount(4);
  for (const card of await kpiCards.all()) {
    const val = Number((await card.locator("p.font-hand").textContent())?.trim());
    expect(val).toBeGreaterThanOrEqual(1);
  }

  await expect(page.getByRole("heading", { name: "CRM pipeline breakdown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Booking capacity" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Landing funnel analytics" })).toBeVisible();
  await expect(page.getByText("Page views")).toBeVisible();
  await expect(page.getByText("CTA clicks")).toBeVisible();
  await expect(page.getByText("Form started")).toBeVisible();
  await expect(page.getByText("Form submitted")).toBeVisible();
  await expect(page.getByText("Failed submits")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Views by language" })).toBeVisible();

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(noOverflow, `Expected no horizontal overflow in ${scheme} mode`).toBe(true);
  }

  expect(pageErrors).toEqual([]);
});

test("sign out clears session and subsequent API requests return 401", async ({ page }, info) => {
  const project = info.project.name as ProjectName;
  await signInToPanel(page, project);

  expect((await page.request.get("/api/panel/overview")).status()).toBe(200);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();

  const afterSignOut = await page.request.get("/api/panel/overview");
  expect(afterSignOut.status()).toBe(401);
  expect(afterSignOut.headers()["cache-control"]).toBe("no-store");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
});

test("Phase 1 CRM: workspace settings, stages, custom fields, members, contacts, deals, claim, tasks, notes, and zero overflow", async ({
  page,
}, info) => {
  const project = info.project.name as ProjectName;
  const uid = makeUid(project);
  const rawPhone = makePhone(project, info.workerIndex);
  const localPhoneInput = `0${rawPhone.slice(4, 6)} ${rawPhone.slice(6, 9)} ${rawPhone.slice(9, 11)} ${rawPhone.slice(11, 13)}`;

  const contactName = `Leyla ${uid}`;
  const dealTitle = `IELTS Group ${uid}`;
  const stageName = `Follow-up ${uid}`;
  const renamedStageName = `Call Back ${uid}`;
  const fieldName = `Target Score ${uid}`;
  const memberId = `op_${uid}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const memberName = `Operator ${uid}`;
  const taskTitle = `Call parent ${uid}`;
  const noteBody = `Weekend slot preferred ${uid}`;

  await signInToPanel(page, project);

  // 1. Settings: stage, custom field, team member
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Demo Operator");
  await expect(page.getByLabel("Inbox: Email", { exact: true })).toBeDisabled();
  await page.getByRole("switch", { name: "Receive notifications" }).check();
  await page.getByLabel("Inbox: Email", { exact: true }).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile saved in this browser." })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Inbox: Email", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Workspace settings" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Workspace settings" })).toBeVisible();

  const stagesSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Pipeline stages" }),
  });
  await stagesSection.getByLabel("New stage name").fill(stageName);
  await stagesSection.getByRole("button", { name: "Add stage" }).click();
  const stageItem = stagesSection.locator("li", { hasText: stageName });
  await expect(stageItem).toBeVisible();

  await stageItem.getByRole("button", { name: "Rename" }).click();
  await stagesSection.getByLabel("Rename").fill(renamedStageName);
  await stagesSection.getByRole("button", { name: "Save changes" }).click();
  await expect(stagesSection.locator("li", { hasText: renamedStageName })).toBeVisible();

  await page.getByLabel("Field name").fill(fieldName);
  await page.getByLabel("Field type").selectOption("number");
  await page.getByRole("button", { name: "Add field" }).click();
  await expect(page.locator("li", { hasText: fieldName })).toBeVisible();

  await page.getByRole("button", { name: "User management" }).click();
  await page.getByLabel("Member ID").fill(memberId);
  await page.getByLabel("Member name").fill(memberName);
  await page.getByLabel("Role").selectOption("operator");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.locator("li", { hasText: memberName })).toBeVisible();

  // 2. Contacts tab: create contact with unformatted phone -> canonical +994...
  await page.getByRole("tab", { name: /Contacts/ }).click();
  await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
  await page.getByRole("button", { name: "New contact" }).click();
  await page.getByLabel("Full name").fill(contactName);
  await page.getByLabel("Phone number").fill(localPhoneInput);
  await page.getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByRole("heading", { name: contactName })).toBeVisible();
  await expect(page.getByText(rawPhone).first()).toBeVisible();

  // 3. Deals tab: create deal, claim, move stage, open detail
  await page.getByRole("tab", { name: /Deals/ }).click();
  await expect(page.getByRole("heading", { name: "Sales pipeline" })).toBeVisible();
  await page.getByRole("button", { name: "New deal" }).click();

  const createSection = page.getByRole("region", { name: "Create new deal" });
  await createSection.getByLabel("Deal title").fill(dealTitle);
  await createSection.getByLabel("Contact", { exact: true }).selectOption({ label: `${contactName} (${rawPhone})` });
  await createSection.getByLabel("Amount").fill("180");
  await createSection.getByRole("button", { name: "Create deal" }).click();

  // Verify on Kanban, then switch to List view and interact
  await expect(page.getByText(dealTitle).first()).toBeVisible();
  await page.getByRole("button", { name: "List" }).click();
  await page.getByLabel("Search deals").fill(dealTitle);

  const dealCard = page.locator("article", { hasText: dealTitle });
  await expect(dealCard).toBeVisible();
  await dealCard.getByRole("button", { name: "Claim" }).click();
  await expect(dealCard.getByRole("button", { name: "Claim" })).toHaveCount(0);

  await dealCard.getByLabel("Move deal to stage").selectOption({ label: renamedStageName });

  // 4. Verify in-use stage deletion returns 409 conflict banner
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Workspace settings" }).click();
  const inUseStage = page.locator("li", { hasText: renamedStageName });
  await inUseStage.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Stage has existing deals and cannot be deleted.")).toBeVisible();

  // 5. Deal Detail: tasks, notes, custom fields, timeline
  await page.getByRole("tab", { name: /Deals/ }).click();
  await page.getByLabel("Search deals").fill(dealTitle);
  await page.locator("article", { hasText: dealTitle }).getByRole("button", { name: "Open" }).click();
  await expect(page.getByRole("heading", { name: dealTitle })).toBeVisible();

  await page.getByRole("button", { name: /Tasks & Notes/ }).click();
  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByRole("button", { name: "Add task" }).click();
  const taskItem = page.locator("li", { hasText: taskTitle });
  await expect(taskItem).toBeVisible();
  await taskItem.getByRole("button", { name: "Mark done" }).click();
  await expect(taskItem.getByRole("button", { name: "Reopen" })).toBeVisible();

  await page.getByLabel("New note").fill(noteBody);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.locator("li", { hasText: noteBody })).toBeVisible();

  await page.getByRole("button", { name: "Custom Fields" }).click();
  await page.getByLabel(fieldName).fill("7.5");
  await page.getByRole("button", { name: "Save fields" }).click();
  await expect(page.getByText("Custom fields saved.")).toBeVisible();

  await page.getByRole("button", { name: "Timeline & Reply" }).click();
  await expect(page.getByText("Stage updated")).toBeVisible();
  await expect(page.getByText("Task completed")).toBeVisible();

  // 6. Responsive + light/dark overflow check across CRM tabs
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(noOverflow, `Expected no horizontal overflow on DealDetail in ${scheme} mode`).toBe(true);
  }

  // Reload and confirm persistence in Contacts linked deals
  await page.reload();
  await page.getByRole("tab", { name: /Contacts/ }).click();
  await page.getByLabel("Search contacts").fill(contactName);
  await page.getByRole("button", { name: new RegExp(contactName) }).click();
  await expect(page.locator("li", { hasText: dealTitle })).toBeVisible();
});

test("Google sign-in is informational without OAuth provisioning; cannot bypass key authentication", async ({ page }) => {
  await page.goto("/az/login");
  const before = await page.request.get("/api/panel/overview");
  expect(before.status()).toBe(401);
  await page.getByRole("button", { name: /Google/ }).click();
  await expect(page).toHaveURL(/\/az\/login$/);
  await expect(page.getByRole("status")).toContainText(/OAuth/i);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === "qeydai_panel")).toBe(false);
  expect((await page.request.get("/api/panel/overview")).status()).toBe(401);
});
