# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: subpages.spec.ts >> standalone login signs into panel and register page links back to login
- Location: tests\e2e\subpages.spec.ts:89:1

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
- alert: Sign in
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { existsSync, readFileSync } from "node:fs";
  3   | import { E2E_ADMIN_KEYS, LEADS_FILE } from "../../playwright.config";
  4   | 
  5   | type ProjectName = "desktop" | "mobile";
  6   | 
  7   | const ALL_SUBPAGE_PATHS = [
  8   |   "/az/product",
  9   |   "/az/pipeline",
  10  |   "/az/inbox",
  11  |   "/az/ai",
  12  |   "/az/booking",
  13  |   "/az/channels",
  14  |   "/az/channels/whatsapp",
  15  |   "/az/channels/instagram",
  16  |   "/az/channels/telegram",
  17  |   "/az/channels/webhook-api",
  18  |   "/az/tools",
  19  |   "/az/scenarios/fitness-centers",
  20  |   "/az/blog",
  21  |   "/az/blog/whatsapp-automation",
  22  |   "/az/pricing",
  23  |   "/az/demo",
  24  |   "/az/contact",
  25  |   "/az/login",
  26  |   "/az/register",
  27  |   "/az/legal/terms",
  28  |   "/az/legal/privacy",
  29  | ];
  30  | 
  31  | test("all subpages render HTTP 200 with h1 and zero horizontal overflow", async ({ page }) => {
  32  |   for (const path of ALL_SUBPAGE_PATHS) {
  33  |     const res = await page.goto(path);
  34  |     expect(res?.status(), `status for ${path}`).toBe(200);
  35  |     await expect(page.getByRole("heading", { level: 1 }), `h1 on ${path}`).toBeVisible();
  36  |     const overflow = await page.evaluate(
  37  |       () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  38  |     );
  39  |     expect(overflow, `overflow on ${path}`).toBeLessThanOrEqual(0);
  40  |   }
  41  | });
  42  | 
  43  | test("unknown channel or blog slugs return 404", async ({ request }) => {
  44  |   expect((await request.get("/az/channels/shopify")).status()).toBe(404);
  45  |   expect((await request.get("/az/blog/unknown")).status()).toBe(404);
  46  |   expect((await request.get("/en/channels/constructor")).status()).toBe(404);
  47  | });
  48  | 
  49  | test("WhatsApp tools workbench builds links, blocks unsafe QR, estimates fees, and switches locale", async ({
  50  |   page,
  51  | }) => {
  52  |   await page.goto("/az/tools");
  53  |   await expect(page.locator("html")).toHaveAttribute("lang", "az");
  54  | 
  55  |   await page.locator("#wa-phone").fill("050 123 45 67");
  56  |   await page.locator("#wa-message").fill("Salam, kurslar haqqında məlumat almaq istəyirəm");
  57  |   await expect(page.locator('[data-testid="wa-link-output"]')).toContainText("https://wa.me/994501234567?text=");
  58  | 
  59  |   await page.getByRole("tab", { name: "QR Kod Endirici" }).click();
  60  |   await page.locator("#qr-url").fill("javascript:alert(1)");
  61  |   await expect(page.locator(".pm-error-note")).toBeVisible();
  62  |   await page.locator("#qr-url").fill("https://wa.me/994501234567");
  63  |   await expect(page.locator(".pm-qr-preview svg")).toBeVisible();
  64  | 
  65  |   await page.getByRole("tab", { name: "Xərc Kalkulyatoru" }).click();
  66  |   await page.locator("#calc-marketing").fill("1000");
  67  |   await page.locator("#calc-utility").fill("0");
  68  |   await page.locator("#calc-auth").fill("0");
  69  |   await expect(page.locator(".pm-calc-total strong")).toContainText("$45.00");
  70  | 
  71  |   await page.locator('[data-track-lang="en"]').click();
  72  |   await expect(page).toHaveURL(/\/en\/tools$/);
  73  |   await expect(page.locator("html")).toHaveAttribute("lang", "en");
  74  | });
  75  | 
  76  | test("demo page submits lead form cleanly", async ({ page }, info) => {
  77  |   const tail = info.project.name === "mobile" ? "91" : "92";
  78  |   await page.goto("/az/demo");
  79  |   await page.getByLabel("Adınız").fill("Nigar");
  80  |   await page.getByLabel(/^Telefon/).fill(`055 234 56 ${tail}`);
  81  |   await page.getByRole("button", { name: "Demo istə" }).click();
  82  |   await expect(page.getByRole("status")).toContainText("Təşəkkürlər");
  83  |   if (existsSync(LEADS_FILE)) {
  84  |     const content = readFileSync(LEADS_FILE, "utf8");
  85  |     expect(content).toContain(`+9945523456${tail}`);
  86  |   }
  87  | });
  88  | 
  89  | test("standalone login signs into panel and register page links back to login", async ({ page }, info) => {
  90  |   const project = info.project.name as ProjectName;
  91  |   await page.goto("/en/register");
  92  |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  93  |   await page.getByRole("link", { name: "Sign in to your panel" }).click();
  94  |   await expect(page).toHaveURL(/\/en\/login$/);
  95  | 
  96  |   await page.getByLabel("Workspace access key").fill(E2E_ADMIN_KEYS[project]);
  97  |   await page.getByRole("button", { name: "Sign in to panel" }).click();
  98  |   await expect(page).toHaveURL(/\/en\/panel$/);
> 99  |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
  100 | });
  101 | 
  102 | test("sitemap includes localized subpage URLs", async ({ request }) => {
  103 |   const res = await request.get("/sitemap.xml");
  104 |   expect(res.status()).toBe(200);
  105 |   const xml = await res.text();
  106 |   expect(xml).toContain("/az/product");
  107 |   expect(xml).toContain("/en/channels/whatsapp");
  108 |   expect(xml).toContain("/az/tools");
  109 |   expect(xml).toContain("/en/blog/whatsapp-automation");
  110 | });
  111 | 
```