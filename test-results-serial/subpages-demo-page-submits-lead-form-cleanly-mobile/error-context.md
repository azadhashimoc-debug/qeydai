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
          - link "EN" [ref=e13] [cursor=pointer]:
            - /url: /en/demo
          - button "Menyunu aç" [ref=e15]
    - main [ref=e18]:
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]: Canlı Təqdimat
          - heading "panelim.az İmkanlarını Öz Biznesinizdə Görün" [level=1] [ref=e23]
          - paragraph [ref=e24]: 15 dəqiqəlik canlı demoda WhatsApp, Instagram və Telegram müraciətlərinin necə vahid sistemdə idarə olunduğunu nümayiş etdirək.
          - generic [ref=e25]:
            - link "Demo görüşü təyin et" [ref=e26] [cursor=pointer]:
              - /url: "#demo-form"
            - link "Qiymətlərlə tanış olun" [ref=e27] [cursor=pointer]:
              - /url: /az/pricing
        - img "panelim.az İmkanlarını Öz Biznesinizdə Görün" [ref=e31]
      - generic [ref=e33]:
        - generic [ref=e34]:
          - strong [ref=e35]: 24/7
          - generic [ref=e36]: Avtomatik sınaq dərsi qeydiyyatı
        - generic [ref=e37]:
          - strong [ref=e38]: 3 Kanal
          - generic [ref=e39]: WhatsApp, Instagram və Telegram tək qutuda
        - generic [ref=e40]:
          - strong [ref=e41]: < 30 san
          - generic [ref=e42]: Təkrar qeydiyyat qoruması ilə ani cavab
      - generic [ref=e44]:
        - generic [ref=e45]:
          - heading "Demo görüşü sifariş edin" [level=2] [ref=e46]
          - paragraph [ref=e47]: Məlumatlarınızı daxil edin, mütəxəssisimiz 24 saat ərzində sizinlə əlaqə saxlasın.
        - generic [ref=e49]:
          - generic [ref=e50]:
            - generic [ref=e51]: Adınız və soyadınız
            - textbox "Adınız və soyadınız" [ref=e52]:
              - /placeholder: məs. Aygün Məmmədova
              - text: Nigar
          - generic [ref=e53]:
            - generic [ref=e54]: Telefon nömrəniz
            - textbox "Telefon nömrəniz" [active] [ref=e55]:
              - /placeholder: 050 123 45 67
              - text: 055 234 56 91
          - button "Demo görüşü təyin et" [ref=e56] [cursor=pointer]
          - status [ref=e57]: Məlumatlarınız tam məxfi saxlanılır və üçüncü tərəflərə ötürülmür.
      - generic [ref=e59]:
        - generic [ref=e60]:
          - heading "Müştəri müraciətlərini qeydiyyata və satışa çevirin" [level=2] [ref=e61]
          - paragraph [ref=e62]: WhatsApp, Instagram və Telegram mesajlarını tək iş masasında birləşdirin, AI köməkçi ilə cavablandırın.
        - generic [ref=e63]:
          - link "Pulsuz demo istəyin" [ref=e64] [cursor=pointer]:
            - /url: /az/contact
          - link "Hələ hesabınız yoxdur?" [ref=e65] [cursor=pointer]:
            - /url: /az/login
    - contentinfo [ref=e66]:
      - generic [ref=e67]:
        - generic [ref=e68]:
          - generic [ref=e69]:
            - link "panelim.az" [ref=e70] [cursor=pointer]:
              - /url: /az
            - paragraph [ref=e76]: Azərbaycan biznesləri üçün mesajlaşma və satış CRM-i.
          - generic [ref=e77]:
            - generic [ref=e78]:
              - heading "Məhsul" [level=4] [ref=e79]
              - list [ref=e80]:
                - listitem [ref=e81]:
                  - link "Ümumi baxış" [ref=e82] [cursor=pointer]:
                    - /url: /az/product
                - listitem [ref=e83]:
                  - link "Satış qıfı (Kanban)" [ref=e84] [cursor=pointer]:
                    - /url: /az/pipeline
                - listitem [ref=e85]:
                  - link "Vahid mesaj qutusu" [ref=e86] [cursor=pointer]:
                    - /url: /az/inbox
                - listitem [ref=e87]:
                  - link "AI satış köməkçisi" [ref=e88] [cursor=pointer]:
                    - /url: /az/ai
                - listitem [ref=e89]:
                  - link "Rezervasiya və cədvəl" [ref=e90] [cursor=pointer]:
                    - /url: /az/booking
            - generic [ref=e91]:
              - heading "Kanallar və Alətlər" [level=4] [ref=e92]
              - list [ref=e93]:
                - listitem [ref=e94]:
                  - link "WhatsApp Cloud API kanalı" [ref=e95] [cursor=pointer]:
                    - /url: /az/channels/whatsapp
                - listitem [ref=e96]:
                  - link "Instagram Direct mesajları" [ref=e97] [cursor=pointer]:
                    - /url: /az/channels/instagram
                - listitem [ref=e98]:
                  - link "Telegram Bot bağlantısı" [ref=e99] [cursor=pointer]:
                    - /url: /az/channels/telegram
                - listitem [ref=e100]:
                  - link "REST Webhook və n8n" [ref=e101] [cursor=pointer]:
                    - /url: /az/channels/webhook-api
                - listitem [ref=e102]:
                  - link "Pulsuz WhatsApp alətləri" [ref=e103] [cursor=pointer]:
                    - /url: /az/tools
            - generic [ref=e104]:
              - heading "Resurslar" [level=4] [ref=e105]
              - list [ref=e106]:
                - listitem [ref=e107]:
                  - link "Qiymət və planlar" [ref=e108] [cursor=pointer]:
                    - /url: /az/pricing
                - listitem [ref=e109]:
                  - link "Fitnes nümunə ssenarisi" [ref=e110] [cursor=pointer]:
                    - /url: /az/scenarios/fitness-centers
                - listitem [ref=e111]:
                  - link "Bələdçilər və bloq" [ref=e112] [cursor=pointer]:
                    - /url: /az/blog
            - generic [ref=e113]:
              - heading "Əlaqə və Hüquqi" [level=4] [ref=e114]
              - list [ref=e115]:
                - listitem [ref=e116]:
                  - link "İstifadə şərtləri" [ref=e117] [cursor=pointer]:
                    - /url: /az/legal/terms
                - listitem [ref=e118]:
                  - link "Məxfilik siyasəti" [ref=e119] [cursor=pointer]:
                    - /url: /az/legal/privacy
                - listitem [ref=e120]:
                  - link "İşçi paneli girişi" [ref=e121] [cursor=pointer]:
                    - /url: /az/login
        - generic [ref=e122]:
          - paragraph [ref=e123]: © 2026 panelim.az. Bütün hüquqlar qorunur.
          - link "English" [ref=e124] [cursor=pointer]:
            - /url: /en/demo
  - alert [ref=e125]
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