# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel.spec.ts >> SEO noindex, unauthenticated 401, invalid key rejection, and session persistence across reload
- Location: tests\e2e\panel.spec.ts:60:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Today at a glance' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Today at a glance' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Today at a glance' })

```

```yaml
- alert
- link "Skip to main content":
  - /url: "#main"
- banner:
  - navigation "Panel navigation":
    - link "panelim.az":
      - /url: /en
    - 'link "Language: AZ"':
      - /url: /az/panel
      - text: az
    - link "Back to site":
      - /url: /en
- main:
  - paragraph: Learning center register
  - text: Staff panel
  - heading "Staff panel sign in" [level=1]
  - paragraph: Enter your center admin key to manage trial sessions, leads, and conversations.
  - text: Username
  - textbox "Username":
    - /placeholder: user@example.com
  - text: Access key
  - textbox "Access key":
    - /placeholder: Enter your center admin key
  - button "Show key"
  - button "Sign in to panel"
  - status: Session is stored in a secure HttpOnly cookie.
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { E2E_ADMIN_KEYS, E2E_BASE_URL, E2E_KEYS } from "../../playwright.config";
  3   | 
  4   | type ProjectName = "desktop" | "mobile";
  5   | 
  6   | const FUTURE_ISO = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  7   | 
  8   | function futureLocalDatetime(daysAhead = 7): string {
  9   |   const d = new Date(Date.now() + daysAhead * 24 * 3600 * 1000);
  10  |   const pad = (n: number) => String(n).padStart(2, "0");
  11  |   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  12  | }
  13  | 
  14  | let idSeq = 0;
  15  | function makeUid(project: ProjectName): string {
  16  |   idSeq += 1;
  17  |   return `${project}-${Date.now().toString(36)}-${idSeq}-${Math.random().toString(36).slice(2, 6)}`;
  18  | }
  19  | 
  20  | let phoneSeq = 0;
  21  | function makePhone(project: ProjectName, workerIndex: number): string {
  22  |   phoneSeq = (phoneSeq + 1) % 100;
  23  |   const projDigit = project === "desktop" ? "1" : "2";
  24  |   const workerDigit = String(workerIndex % 10);
  25  |   const seqDigits = String(phoneSeq).padStart(2, "0");
  26  |   const randDigits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  27  |   // Uses 077 prefix with project/worker/sequence partitions so concurrent tests never collide.
  28  |   return `+99477${projDigit}${workerDigit}${seqDigits}${randDigits}`;
  29  | }
  30  | 
  31  | async function signInToPanel(page: Page, project: ProjectName): Promise<void> {
  32  |   await page.goto("/en/panel");
  33  |   await expect(page.getByRole("heading", { name: "Staff panel sign in" })).toBeVisible();
  34  |   await page.getByLabel("Username").fill("pilot@example.test");
  35  |   await page.getByLabel("Access key").fill(E2E_ADMIN_KEYS[project]);
  36  |   await page.getByRole("button", { name: "Sign in to panel" }).click();
  37  |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
  38  | }
  39  | 
  40  | test("channel copying, AI previews, and localized plan contact links", async ({ page, context }, info) => {
  41  |   await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  42  |   await signInToPanel(page, info.project.name as ProjectName);
  43  | 
  44  |   await page.getByRole("tab", { name: "Channels" }).click();
  45  |   await page.getByRole("button", { name: "Copy webhook" }).first().click();
  46  |   await expect(page.getByText("Webhook copied.")).toBeVisible();
  47  | 
  48  |   await page.getByRole("tab", { name: "AI assistant" }).click();
  49  |   const preview = page.getByRole("button", { name: "Preview" }).first();
  50  |   await preview.click();
  51  |   await expect(page.getByRole("button", { name: "Close", exact: true })).toHaveAttribute("aria-expanded", "true");
  52  | 
  53  |   await page.getByRole("tab", { name: "Plans" }).click();
  54  |   await expect(page.getByText("Starter", { exact: true })).toBeVisible();
  55  |   await page.getByRole("radio", { name: "Monthly", exact: true }).check();
  56  |   await expect(page.getByText("100 AZN", { exact: true })).toBeVisible();
  57  |   await expect(page.getByRole("link", { name: "Request pilot" }).first()).toHaveAttribute("href", "/en#contact");
  58  | });
  59  | 
  60  | test("SEO noindex, unauthenticated 401, invalid key rejection, and session persistence across reload", async ({
  61  |   page,
  62  |   request,
  63  | }, info) => {
  64  |   const project = info.project.name as ProjectName;
  65  | 
  66  |   const unauthRes = await request.get("/api/panel/overview");
  67  |   expect(unauthRes.status()).toBe(401);
  68  |   expect(unauthRes.headers()["cache-control"]).toBe("no-store");
  69  | 
  70  |   await page.goto("/en/panel");
  71  |   const robotsMeta = page.locator('meta[name="robots"]');
  72  |   await expect(robotsMeta).toHaveAttribute("content", /noindex/i);
  73  |   await expect(robotsMeta).toHaveAttribute("content", /nofollow/i);
  74  | 
  75  |   await expect(page.getByRole("heading", { name: "Staff panel sign in" })).toBeVisible();
  76  | 
  77  |   await page.getByLabel("Username").fill("pilot@example.test");
  78  |   await page.getByLabel("Access key").fill("invalid-panel-key-0123456789abcdef");
  79  |   await page.getByRole("button", { name: "Sign in to panel" }).click();
  80  |   await expect(page.getByRole("status")).toHaveText("Invalid access key. Check it and try again.");
  81  |   await expect(page.getByLabel("Access key")).toHaveAttribute("aria-invalid", "true");
  82  |   await expect(page.getByRole("heading", { name: "Staff panel sign in" })).toBeVisible();
  83  | 
  84  |   const authPromise = page.waitForResponse(
  85  |     (res) => res.url().includes("/api/panel/auth") && res.request().method() === "POST",
  86  |   );
  87  |   await page.getByLabel("Username").fill("pilot@example.test");
  88  |   await page.getByLabel("Access key").fill(E2E_ADMIN_KEYS[project]);
  89  |   await page.getByRole("button", { name: "Sign in to panel" }).click();
  90  |   const authRes = await authPromise;
  91  |   expect(authRes.status()).toBe(200);
  92  |   const cookies = await page.context().cookies();
  93  |   expect(cookies.some((c) => c.name === "qeydai_panel" && c.httpOnly)).toBe(true);
  94  | 
  95  |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
  96  |   if (project === "desktop") {
  97  |     await expect(page.getByText(`Center: e2e-${project}`)).toBeVisible();
  98  |   }
  99  | 
  100 |   await page.reload();
> 101 |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
  102 |   await expect(page.getByRole("heading", { name: "Staff panel sign in" })).toHaveCount(0);
  103 | });
  104 | 
  105 | test("tenant isolation: panel hides and refuses PATCH for another tenant's lead", async ({
  106 |   page,
  107 |   request,
  108 | }, info) => {
  109 |   const project = info.project.name as ProjectName;
  110 |   const other: ProjectName = project === "desktop" ? "mobile" : "desktop";
  111 |   const uid = makeUid(project);
  112 |   const otherLeadName = `Isolated ${uid}`;
  113 |   const otherLeadPhone = makePhone(other, info.workerIndex);
  114 | 
  115 |   const seedRes = await request.post("/api/v1/leads", {
  116 |     headers: { authorization: `Bearer ${E2E_KEYS[other]}`, "content-type": "application/json" },
  117 |     data: { name: otherLeadName, phone: otherLeadPhone, source: "telegram", note: `secret-${uid}` },
  118 |   });
  119 |   expect(seedRes.status()).toBe(201);
  120 |   const { leadId: otherLeadId } = (await seedRes.json()) as { ok: true; leadId: string };
  121 | 
  122 |   await signInToPanel(page, project);
  123 |   await page.getByRole("tab", { name: /CRM/ }).click();
  124 |   await expect(page.getByRole("heading", { name: "Lead register (CRM)" })).toBeVisible();
  125 | 
  126 |   await expect(page.getByText(otherLeadName)).toHaveCount(0);
  127 |   await page.getByLabel("Search").fill(otherLeadName);
  128 |   await expect(page.getByText(otherLeadName)).toHaveCount(0);
  129 | 
  130 |   const listRes = await page.request.get("/api/panel/leads");
  131 |   expect(listRes.status()).toBe(200);
  132 |   const listJson = (await listRes.json()) as { ok: true; leads: Array<{ id: string }> };
  133 |   expect(listJson.leads.some((l) => l.id === otherLeadId)).toBe(false);
  134 | 
  135 |   const patchRes = await page.request.patch(`/api/panel/leads/${encodeURIComponent(otherLeadId)}`, {
  136 |     headers: { origin: E2E_BASE_URL, "content-type": "application/json" },
  137 |     data: { stage: "contacted" },
  138 |   });
  139 |   expect(patchRes.status()).toBe(404);
  140 | });
  141 | 
  142 | test("sessions tab: create session in UI, enroll via M2M API, and view student roster", async ({
  143 |   page,
  144 |   request,
  145 | }, info) => {
  146 |   const project = info.project.name as ProjectName;
  147 |   const uid = makeUid(project);
  148 |   const sessionId = `s-ui-${uid}`;
  149 |   const courseId = `IELTS-${uid.slice(-6)}`;
  150 |   const studentName = `Aygün ${uid.slice(-5)}`;
  151 |   const studentPhone = makePhone(project, info.workerIndex);
  152 | 
  153 |   await signInToPanel(page, project);
  154 |   await page.getByRole("tab", { name: /Sessions/ }).click();
  155 |   await expect(page.getByRole("heading", { name: "Trial sessions schedule" })).toBeVisible();
  156 | 
  157 |   await page.getByLabel("Session ID").fill(sessionId);
  158 |   await page.getByLabel("Course name").fill(courseId);
  159 |   await page.getByLabel("Start date and time").fill(futureLocalDatetime(7));
  160 |   await page.getByLabel("Seat capacity").fill("4");
  161 |   await page.getByRole("button", { name: "Create session" }).click();
  162 | 
  163 |   await expect(page.getByText("Trial session added to schedule.")).toBeVisible();
  164 | 
  165 |   const sessionItem = page.locator("li", { hasText: sessionId });
  166 |   await expect(sessionItem).toBeVisible();
  167 |   await expect(sessionItem).toContainText(courseId);
  168 |   await expect(sessionItem).toContainText("0/4 taken");
  169 |   await expect(sessionItem).toContainText("4 seats left");
  170 |   await expect(sessionItem.getByRole("button", { name: /Show roster \(0\)/ })).toBeVisible();
  171 | 
  172 |   const enrollRes = await request.post("/api/v1/enroll", {
  173 |     headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
  174 |     data: { sessionId, name: studentName, phone: studentPhone },
  175 |   });
  176 |   expect(enrollRes.status()).toBe(201);
  177 | 
  178 |   await page.getByRole("button", { name: "Refresh" }).click();
  179 |   await expect(sessionItem).toContainText("1/4 taken");
  180 |   await expect(sessionItem).toContainText("3 seats left");
  181 | 
  182 |   const showRosterBtn = sessionItem.getByRole("button", { name: /Show roster \(1\)/ });
  183 |   await expect(showRosterBtn).toBeVisible();
  184 |   await showRosterBtn.click();
  185 | 
  186 |   await expect(sessionItem.getByRole("button", { name: /Hide roster \(1\)/ })).toBeVisible();
  187 |   await expect(sessionItem).toContainText(studentName);
  188 |   await expect(sessionItem).toContainText(studentPhone);
  189 | });
  190 | 
  191 | test("CRM leads pipeline: create lead, update stage and note, filter, and persist across reload", async ({
  192 |   page,
  193 | }, info) => {
  194 |   const project = info.project.name as ProjectName;
  195 |   const uid = makeUid(project);
  196 |   const leadName = `Leyla ${uid}`;
  197 |   const leadPhone = makePhone(project, info.workerIndex);
  198 |   const initialNote = `Interested in IELTS ${uid}`;
  199 |   const updatedNote = `Booked Saturday 11:00 trial (${uid})`;
  200 | 
  201 |   await signInToPanel(page, project);
```