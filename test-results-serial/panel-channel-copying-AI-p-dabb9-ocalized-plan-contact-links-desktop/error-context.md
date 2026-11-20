# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel.spec.ts >> channel copying, AI previews, and localized plan contact links
- Location: tests\e2e\panel.spec.ts:40:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Copy webhook' }).first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - link "Skip to main content" [ref=e4] [cursor=pointer]:
      - /url: "#main"
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - link "panelim.az" [ref=e8] [cursor=pointer]:
            - /url: /en
          - generic [ref=e14]: Staff panel
          - generic [ref=e15]: "Center: e2e-desktop"
        - navigation "Panel navigation" [ref=e16]:
          - button "Refresh" [ref=e17]
          - 'link "Language: AZ" [ref=e18] [cursor=pointer]':
            - /url: /az/panel
            - text: az
          - link "Back to site" [ref=e19] [cursor=pointer]:
            - /url: /en
          - button "Sign out" [ref=e20]
      - tablist "Panel sections" [ref=e23]:
        - tab "Overview" [ref=e24]
        - tab "Deals 0" [ref=e26]:
          - generic [ref=e27]: Deals
          - generic [ref=e28]: "0"
        - tab "Contacts 0" [ref=e29]:
          - generic [ref=e30]: Contacts
          - generic [ref=e31]: "0"
        - tab "Sessions 4" [ref=e32]:
          - generic [ref=e33]: Sessions
          - generic [ref=e34]: "4"
        - tab "CRM 1" [ref=e35]:
          - generic [ref=e36]: CRM
          - generic [ref=e37]: "1"
        - tab "Inbox 0" [ref=e38]:
          - generic [ref=e39]: Inbox
          - generic [ref=e40]: "0"
        - tab "Channels" [active] [selected] [ref=e41]
        - tab "AI assistant" [ref=e43]
        - tab "Plans" [ref=e45]
        - tab "Team & Pipeline" [ref=e47]
    - main [ref=e49]:
      - tabpanel "Channels" [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]:
            - heading "Channels" [level=1] [ref=e53]
            - paragraph [ref=e54]: Connect WhatsApp, Instagram and Telegram channels.
          - generic [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]:
                - generic [ref=e63]:
                  - paragraph [ref=e64]: WhatsApp
                  - paragraph [ref=e65]: https://panelim.az/api/channels/whatsapp
                - generic [ref=e66]:
                  - generic [ref=e67]: Active
                  - button "Disconnect" [pressed] [ref=e68]
                  - button "Webhook URL" [ref=e69]
              - status
            - generic [ref=e70]:
              - generic [ref=e71]:
                - generic [ref=e79]:
                  - paragraph [ref=e80]: Instagram
                  - paragraph [ref=e81]: https://panelim.az/api/channels/instagram
                - generic [ref=e82]:
                  - generic [ref=e83]: Inactive
                  - button "Connect" [ref=e84]
                  - button "Webhook URL" [ref=e85]
              - status
            - generic [ref=e86]:
              - generic [ref=e87]:
                - generic [ref=e93]:
                  - paragraph [ref=e94]: Telegram
                  - paragraph [ref=e95]: https://panelim.az/api/channels/telegram
                - generic [ref=e96]:
                  - generic [ref=e97]: Active
                  - button "Disconnect" [pressed] [ref=e98]
                  - button "Webhook URL" [ref=e99]
              - status
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
> 45  |   await page.getByRole("button", { name: "Copy webhook" }).first().click();
      |                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  101 |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
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
```