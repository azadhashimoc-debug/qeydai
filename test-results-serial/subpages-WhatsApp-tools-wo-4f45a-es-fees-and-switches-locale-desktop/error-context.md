# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: subpages.spec.ts >> WhatsApp tools workbench builds links, blocks unsafe QR, estimates fees, and switches locale
- Location: tests\e2e\subpages.spec.ts:49:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('tab', { name: 'QR Kod Endirici' })

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
            - /url: /en/tools
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
          - generic [ref=e39]: Tam Ödənişsiz
          - heading "WhatsApp Satışınızı Gücləndirən 3 Praktik Alət" [level=1] [ref=e40]
          - paragraph [ref=e41]: Link qurun, çap üçün QR kod yükləyin və Meta-nın rəsmi tariflərinə əsasən təxmini mesaj xərclərini hesablayın.
          - link "Məhsulu kəşf edin" [ref=e43] [cursor=pointer]:
            - /url: /az/channels/whatsapp
        - img "WhatsApp Satışınızı Gücləndirən 3 Praktik Alət" [ref=e47]
      - generic [ref=e50]:
        - tablist "Tam Ödənişsiz" [ref=e51]:
          - tab "Link Qurucu" [selected] [ref=e52] [cursor=pointer]
          - tab "QR Kod Yaradıcı" [ref=e53] [cursor=pointer]
          - tab "Xərc Kalkulyatoru" [ref=e54] [cursor=pointer]
        - tabpanel [ref=e55]:
          - generic [ref=e56]:
            - generic [ref=e57]:
              - heading "Bir Kliklə WhatsApp Linki Yaradın" [level=2] [ref=e58]
              - paragraph [ref=e59]: Müştərilərin nömrənizi kontaktlara əlavə etmədən birbaşa söhbətə başlaması üçün xüsusi link hazırlayın.
            - generic [ref=e60]:
              - generic [ref=e61]:
                - generic [ref=e62]: Ölkə kodu
                - combobox "Ölkə kodu" [ref=e63]:
                  - option "AZ (+994)" [selected]
                  - option "TR (+90)"
                  - option "RU / KZ (+7)"
                  - option "US / CA (+1)"
                  - option "UK (+44)"
                  - option "Custom"
              - generic [ref=e64]:
                - generic [ref=e65]: Telefon nömrəsi
                - textbox "Telefon nömrəsi" [ref=e66]:
                  - /placeholder: 050 123 45 67
                  - text: 050 123 45 67
            - generic [ref=e67]:
              - generic [ref=e68]: İlkin hazır mesaj (istəyə görə)
              - textbox "İlkin hazır mesaj (istəyə görə)" [active] [ref=e69]:
                - /placeholder: Salam, IELTS sınaq dərsi üçün məlumat almaq istəyirəm.
                - text: Salam, kurslar haqqında məlumat almaq istəyirəm
          - generic [ref=e70]:
            - strong [ref=e72]: Hazır WhatsApp linkiniz
            - generic [ref=e73]: https://wa.me/994501234567?text=Salam%2C%20kurslar%20haqq%C4%B1nda%20m%C9%99lumat%20almaq%20ist%C9%99yir%C9%99m
            - button "Linki kopyala" [ref=e74] [cursor=pointer]
            - generic [ref=e75]:
              - paragraph [ref=e76]: Telefon ekranında necə görünür
              - paragraph [ref=e78]: Salam, kurslar haqqında məlumat almaq istəyirəm
      - generic [ref=e81]:
        - article [ref=e82]:
          - generic [ref=e83]:
            - generic [ref=e84]: Giriş Nöqtəsi
            - heading "Marağı birbaşa WhatsApp söhbətinə çevirin" [level=3] [ref=e85]
            - paragraph [ref=e86]: Xüsusi wa.me linkini və ya QR kodunu Instagram bio-da, elanlarda və kurs səhifənizdə yerləşdirin ki, tələbələr bir toxunuşla yazsınlar.
          - img "WhatsApp linki" [ref=e90]
        - article [ref=e91]:
          - generic [ref=e92]:
            - generic [ref=e93]: AI Sürəti
            - heading "AI hər mesajı anında cavablasın" [level=3] [ref=e94]
            - paragraph [ref=e95]: Linkdən gələn müraciətləri panelim.az-a bağlayın ki, sınaq dərsi cədvəli və boş yer məlumatı 24/7 avtomatik göndərilsin.
          - img "AI cavablar" [ref=e99]
      - generic [ref=e101]:
        - heading "Tez-tez verilən suallar" [level=2] [ref=e103]
        - generic [ref=e104]:
          - group [ref=e105]:
            - generic "WhatsApp linki və QR kodu yaratmaq pulsuzdur? +" [ref=e106] [cursor=pointer]
          - group [ref=e107]:
            - generic "Niyə hazır salamlama mesajı əlavə etmək lazımdır? +" [ref=e108] [cursor=pointer]
      - generic [ref=e110]:
        - generic [ref=e111]:
          - heading "Müştəri müraciətlərini qeydiyyata və satışa çevirin" [level=2] [ref=e112]
          - paragraph [ref=e113]: WhatsApp, Instagram və Telegram mesajlarını tək iş masasında birləşdirin, AI köməkçi ilə cavablandırın.
        - generic [ref=e114]:
          - link "Pulsuz demo istəyin" [ref=e115] [cursor=pointer]:
            - /url: /az/demo
          - link "Qiymətlərlə tanış olun" [ref=e116] [cursor=pointer]:
            - /url: /az/login
    - contentinfo [ref=e117]:
      - generic [ref=e118]:
        - generic [ref=e119]:
          - generic [ref=e120]:
            - link "panelim.az" [ref=e121] [cursor=pointer]:
              - /url: /az
            - paragraph [ref=e127]: Azərbaycan biznesləri üçün mesajlaşma və satış CRM-i.
          - generic [ref=e128]:
            - generic [ref=e129]:
              - heading "Məhsul" [level=4] [ref=e130]
              - list [ref=e131]:
                - listitem [ref=e132]:
                  - link "Ümumi baxış" [ref=e133] [cursor=pointer]:
                    - /url: /az/product
                - listitem [ref=e134]:
                  - link "Satış qıfı (Kanban)" [ref=e135] [cursor=pointer]:
                    - /url: /az/pipeline
                - listitem [ref=e136]:
                  - link "Vahid mesaj qutusu" [ref=e137] [cursor=pointer]:
                    - /url: /az/inbox
                - listitem [ref=e138]:
                  - link "AI satış köməkçisi" [ref=e139] [cursor=pointer]:
                    - /url: /az/ai
                - listitem [ref=e140]:
                  - link "Rezervasiya və cədvəl" [ref=e141] [cursor=pointer]:
                    - /url: /az/booking
            - generic [ref=e142]:
              - heading "Kanallar və Alətlər" [level=4] [ref=e143]
              - list [ref=e144]:
                - listitem [ref=e145]:
                  - link "WhatsApp Cloud API kanalı" [ref=e146] [cursor=pointer]:
                    - /url: /az/channels/whatsapp
                - listitem [ref=e147]:
                  - link "Instagram Direct mesajları" [ref=e148] [cursor=pointer]:
                    - /url: /az/channels/instagram
                - listitem [ref=e149]:
                  - link "Telegram Bot bağlantısı" [ref=e150] [cursor=pointer]:
                    - /url: /az/channels/telegram
                - listitem [ref=e151]:
                  - link "REST Webhook və n8n" [ref=e152] [cursor=pointer]:
                    - /url: /az/channels/webhook-api
                - listitem [ref=e153]:
                  - link "Pulsuz WhatsApp alətləri" [ref=e154] [cursor=pointer]:
                    - /url: /az/tools
            - generic [ref=e155]:
              - heading "Resurslar" [level=4] [ref=e156]
              - list [ref=e157]:
                - listitem [ref=e158]:
                  - link "Qiymət və planlar" [ref=e159] [cursor=pointer]:
                    - /url: /az/pricing
                - listitem [ref=e160]:
                  - link "Fitnes nümunə ssenarisi" [ref=e161] [cursor=pointer]:
                    - /url: /az/scenarios/fitness-centers
                - listitem [ref=e162]:
                  - link "Bələdçilər və bloq" [ref=e163] [cursor=pointer]:
                    - /url: /az/blog
            - generic [ref=e164]:
              - heading "Əlaqə və Hüquqi" [level=4] [ref=e165]
              - list [ref=e166]:
                - listitem [ref=e167]:
                  - link "İstifadə şərtləri" [ref=e168] [cursor=pointer]:
                    - /url: /az/legal/terms
                - listitem [ref=e169]:
                  - link "Məxfilik siyasəti" [ref=e170] [cursor=pointer]:
                    - /url: /az/legal/privacy
                - listitem [ref=e171]:
                  - link "İşçi paneli girişi" [ref=e172] [cursor=pointer]:
                    - /url: /az/login
        - generic [ref=e173]:
          - paragraph [ref=e174]: © 2026 panelim.az. Bütün hüquqlar qorunur.
          - link "English" [ref=e175] [cursor=pointer]:
            - /url: /en/tools
  - alert [ref=e176]
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
> 59  |   await page.getByRole("tab", { name: "QR Kod Endirici" }).click();
      |                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
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