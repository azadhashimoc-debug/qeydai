# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: subpages.spec.ts >> demo page submits lead form cleanly
- Location: tests\e2e\subpages.spec.ts:76:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Demo istə' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - link "Əsas məzmuna keç" [ref=e3] [cursor=pointer]:
      - /url: "#main"
    - banner [ref=e4]:
      - navigation "Əsas naviqasiya" [ref=e5]:
        - link "panelim.az" [ref=e6] [cursor=pointer]:
          - /url: /az
        - generic [ref=e12]:
          - button "Məhsul" [ref=e14] [cursor=pointer]
          - button "Kanallar və Alətlər" [ref=e19] [cursor=pointer]
          - link "Qiymət planları" [ref=e23] [cursor=pointer]:
            - /url: /az/pricing
          - button "Resurslar" [ref=e25] [cursor=pointer]
        - generic [ref=e29]:
          - link "EN" [ref=e30] [cursor=pointer]:
            - /url: /en/demo
          - generic [ref=e31]:
            - link "Daxil ol" [ref=e32] [cursor=pointer]:
              - /url: /az/login
            - link "Qeydiyyat" [ref=e33] [cursor=pointer]:
              - /url: /az/register
            - link "Demo istə" [ref=e34] [cursor=pointer]:
              - /url: /az/demo
    - main [ref=e35]:
      - generic [ref=e37]:
        - generic [ref=e38]:
          - generic [ref=e39]: Canlı Təqdimat
          - heading "panelim.az İmkanlarını Öz Biznesinizdə Görün" [level=1] [ref=e40]
          - paragraph [ref=e41]: 15 dəqiqəlik canlı demoda WhatsApp, Instagram və Telegram müraciətlərinin necə vahid sistemdə idarə olunduğunu nümayiş etdirək.
          - generic [ref=e42]:
            - link "Demo görüşü təyin et" [ref=e43] [cursor=pointer]:
              - /url: "#demo-form"
            - link "Qiymətlərlə tanış olun" [ref=e44] [cursor=pointer]:
              - /url: /az/pricing
        - img "panelim.az İmkanlarını Öz Biznesinizdə Görün" [ref=e48]
      - generic [ref=e50]:
        - generic [ref=e51]:
          - strong [ref=e52]: 24/7
          - generic [ref=e53]: Avtomatik sınaq dərsi qeydiyyatı
        - generic [ref=e54]:
          - strong [ref=e55]: 3 Kanal
          - generic [ref=e56]: WhatsApp, Instagram və Telegram tək qutuda
        - generic [ref=e57]:
          - strong [ref=e58]: < 30 san
          - generic [ref=e59]: Təkrar qeydiyyat qoruması ilə ani cavab
      - generic [ref=e61]:
        - generic [ref=e62]:
          - heading "Demo görüşü sifariş edin" [level=2] [ref=e63]
          - paragraph [ref=e64]: Məlumatlarınızı daxil edin, mütəxəssisimiz 24 saat ərzində sizinlə əlaqə saxlasın.
        - generic [ref=e66]:
          - generic [ref=e67]:
            - generic [ref=e68]: Adınız və soyadınız
            - textbox "Adınız və soyadınız" [ref=e69]:
              - /placeholder: məs. Aygün Məmmədova
              - text: Nigar
          - generic [ref=e70]:
            - generic [ref=e71]: Telefon nömrəniz
            - textbox "Telefon nömrəniz" [active] [ref=e72]:
              - /placeholder: 050 123 45 67
              - text: 055 234 56 92
          - button "Demo görüşü təyin et" [ref=e73] [cursor=pointer]
          - status [ref=e74]: Məlumatlarınız tam məxfi saxlanılır və üçüncü tərəflərə ötürülmür.
      - generic [ref=e76]:
        - generic [ref=e77]:
          - heading "Müştəri müraciətlərini qeydiyyata və satışa çevirin" [level=2] [ref=e78]
          - paragraph [ref=e79]: WhatsApp, Instagram və Telegram mesajlarını tək iş masasında birləşdirin, AI köməkçi ilə cavablandırın.
        - generic [ref=e80]:
          - link "Pulsuz demo istəyin" [ref=e81] [cursor=pointer]:
            - /url: /az/contact
          - link "Hələ hesabınız yoxdur?" [ref=e82] [cursor=pointer]:
            - /url: /az/login
    - contentinfo [ref=e83]:
      - generic [ref=e84]:
        - generic [ref=e85]:
          - generic [ref=e86]:
            - link "panelim.az" [ref=e87] [cursor=pointer]:
              - /url: /az
            - paragraph [ref=e93]: Azərbaycan biznesləri üçün mesajlaşma və satış CRM-i.
          - generic [ref=e94]:
            - generic [ref=e95]:
              - heading "Məhsul" [level=4] [ref=e96]
              - list [ref=e97]:
                - listitem [ref=e98]:
                  - link "Ümumi baxış" [ref=e99] [cursor=pointer]:
                    - /url: /az/product
                - listitem [ref=e100]:
                  - link "Satış qıfı (Kanban)" [ref=e101] [cursor=pointer]:
                    - /url: /az/pipeline
                - listitem [ref=e102]:
                  - link "Vahid mesaj qutusu" [ref=e103] [cursor=pointer]:
                    - /url: /az/inbox
                - listitem [ref=e104]:
                  - link "AI satış köməkçisi" [ref=e105] [cursor=pointer]:
                    - /url: /az/ai
                - listitem [ref=e106]:
                  - link "Rezervasiya və cədvəl" [ref=e107] [cursor=pointer]:
                    - /url: /az/booking
            - generic [ref=e108]:
              - heading "Kanallar və Alətlər" [level=4] [ref=e109]
              - list [ref=e110]:
                - listitem [ref=e111]:
                  - link "WhatsApp Cloud API kanalı" [ref=e112] [cursor=pointer]:
                    - /url: /az/channels/whatsapp
                - listitem [ref=e113]:
                  - link "Instagram Direct mesajları" [ref=e114] [cursor=pointer]:
                    - /url: /az/channels/instagram
                - listitem [ref=e115]:
                  - link "Telegram Bot bağlantısı" [ref=e116] [cursor=pointer]:
                    - /url: /az/channels/telegram
                - listitem [ref=e117]:
                  - link "REST Webhook və n8n" [ref=e118] [cursor=pointer]:
                    - /url: /az/channels/webhook-api
                - listitem [ref=e119]:
                  - link "Pulsuz WhatsApp alətləri" [ref=e120] [cursor=pointer]:
                    - /url: /az/tools
            - generic [ref=e121]:
              - heading "Resurslar" [level=4] [ref=e122]
              - list [ref=e123]:
                - listitem [ref=e124]:
                  - link "Qiymət və planlar" [ref=e125] [cursor=pointer]:
                    - /url: /az/pricing
                - listitem [ref=e126]:
                  - link "Fitnes nümunə ssenarisi" [ref=e127] [cursor=pointer]:
                    - /url: /az/scenarios/fitness-centers
                - listitem [ref=e128]:
                  - link "Bələdçilər və bloq" [ref=e129] [cursor=pointer]:
                    - /url: /az/blog
            - generic [ref=e130]:
              - heading "Əlaqə və Hüquqi" [level=4] [ref=e131]
              - list [ref=e132]:
                - listitem [ref=e133]:
                  - link "İstifadə şərtləri" [ref=e134] [cursor=pointer]:
                    - /url: /az/legal/terms
                - listitem [ref=e135]:
                  - link "Məxfilik siyasəti" [ref=e136] [cursor=pointer]:
                    - /url: /az/legal/privacy
                - listitem [ref=e137]:
                  - link "İşçi paneli girişi" [ref=e138] [cursor=pointer]:
                    - /url: /az/login
        - generic [ref=e139]:
          - paragraph [ref=e140]: © 2026 panelim.az. Bütün hüquqlar qorunur.
          - link "English" [ref=e141] [cursor=pointer]:
            - /url: /en/demo
  - alert [ref=e142]
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
> 81  |   await page.getByRole("button", { name: "Demo istə" }).click();
      |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  99  |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
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