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
          - link "EN" [ref=e13] [cursor=pointer]:
            - /url: /en/tools
          - button "Menyunu aç" [ref=e15]
    - main [ref=e18]:
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]: Tam Ödənişsiz
          - heading "WhatsApp Satışınızı Gücləndirən 3 Praktik Alət" [level=1] [ref=e23]
          - paragraph [ref=e24]: Link qurun, çap üçün QR kod yükləyin və Meta-nın rəsmi tariflərinə əsasən təxmini mesaj xərclərini hesablayın.
          - link "Məhsulu kəşf edin" [ref=e26] [cursor=pointer]:
            - /url: /az/channels/whatsapp
        - img "WhatsApp Satışınızı Gücləndirən 3 Praktik Alət" [ref=e30]
      - generic [ref=e33]:
        - tablist "Tam Ödənişsiz" [ref=e34]:
          - tab "Link Qurucu" [selected] [ref=e35] [cursor=pointer]
          - tab "QR Kod Yaradıcı" [ref=e36] [cursor=pointer]
          - tab "Xərc Kalkulyatoru" [ref=e37] [cursor=pointer]
        - tabpanel [ref=e38]:
          - generic [ref=e39]:
            - generic [ref=e40]:
              - heading "Bir Kliklə WhatsApp Linki Yaradın" [level=2] [ref=e41]
              - paragraph [ref=e42]: Müştərilərin nömrənizi kontaktlara əlavə etmədən birbaşa söhbətə başlaması üçün xüsusi link hazırlayın.
            - generic [ref=e43]:
              - generic [ref=e44]:
                - generic [ref=e45]: Ölkə kodu
                - combobox "Ölkə kodu" [ref=e46]:
                  - option "AZ (+994)" [selected]
                  - option "TR (+90)"
                  - option "RU / KZ (+7)"
                  - option "US / CA (+1)"
                  - option "UK (+44)"
                  - option "Custom"
              - generic [ref=e47]:
                - generic [ref=e48]: Telefon nömrəsi
                - textbox "Telefon nömrəsi" [ref=e49]:
                  - /placeholder: 050 123 45 67
                  - text: 050 123 45 67
            - generic [ref=e50]:
              - generic [ref=e51]: İlkin hazır mesaj (istəyə görə)
              - textbox "İlkin hazır mesaj (istəyə görə)" [active] [ref=e52]:
                - /placeholder: Salam, IELTS sınaq dərsi üçün məlumat almaq istəyirəm.
                - text: Salam, kurslar haqqında məlumat almaq istəyirəm
          - generic [ref=e53]:
            - strong [ref=e55]: Hazır WhatsApp linkiniz
            - generic [ref=e56]: https://wa.me/994501234567?text=Salam%2C%20kurslar%20haqq%C4%B1nda%20m%C9%99lumat%20almaq%20ist%C9%99yir%C9%99m
            - button "Linki kopyala" [ref=e57] [cursor=pointer]
            - generic [ref=e58]:
              - paragraph [ref=e59]: Telefon ekranında necə görünür
              - paragraph [ref=e61]: Salam, kurslar haqqında məlumat almaq istəyirəm
      - generic [ref=e64]:
        - article [ref=e65]:
          - generic [ref=e66]:
            - generic [ref=e67]: Giriş Nöqtəsi
            - heading "Marağı birbaşa WhatsApp söhbətinə çevirin" [level=3] [ref=e68]
            - paragraph [ref=e69]: Xüsusi wa.me linkini və ya QR kodunu Instagram bio-da, elanlarda və kurs səhifənizdə yerləşdirin ki, tələbələr bir toxunuşla yazsınlar.
          - img "WhatsApp linki" [ref=e73]
        - article [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]: AI Sürəti
            - heading "AI hər mesajı anında cavablasın" [level=3] [ref=e77]
            - paragraph [ref=e78]: Linkdən gələn müraciətləri panelim.az-a bağlayın ki, sınaq dərsi cədvəli və boş yer məlumatı 24/7 avtomatik göndərilsin.
          - img "AI cavablar" [ref=e82]
      - generic [ref=e84]:
        - heading "Tez-tez verilən suallar" [level=2] [ref=e86]
        - generic [ref=e87]:
          - group [ref=e88]:
            - generic "WhatsApp linki və QR kodu yaratmaq pulsuzdur? +" [ref=e89] [cursor=pointer]
          - group [ref=e90]:
            - generic "Niyə hazır salamlama mesajı əlavə etmək lazımdır? +" [ref=e91] [cursor=pointer]
      - generic [ref=e93]:
        - generic [ref=e94]:
          - heading "Müştəri müraciətlərini qeydiyyata və satışa çevirin" [level=2] [ref=e95]
          - paragraph [ref=e96]: WhatsApp, Instagram və Telegram mesajlarını tək iş masasında birləşdirin, AI köməkçi ilə cavablandırın.
        - generic [ref=e97]:
          - link "Pulsuz demo istəyin" [ref=e98] [cursor=pointer]:
            - /url: /az/demo
          - link "Qiymətlərlə tanış olun" [ref=e99] [cursor=pointer]:
            - /url: /az/login
    - contentinfo [ref=e100]:
      - generic [ref=e101]:
        - generic [ref=e102]:
          - generic [ref=e103]:
            - link "panelim.az" [ref=e104] [cursor=pointer]:
              - /url: /az
            - paragraph [ref=e110]: Azərbaycan biznesləri üçün mesajlaşma və satış CRM-i.
          - generic [ref=e111]:
            - generic [ref=e112]:
              - heading "Məhsul" [level=4] [ref=e113]
              - list [ref=e114]:
                - listitem [ref=e115]:
                  - link "Ümumi baxış" [ref=e116] [cursor=pointer]:
                    - /url: /az/product
                - listitem [ref=e117]:
                  - link "Satış qıfı (Kanban)" [ref=e118] [cursor=pointer]:
                    - /url: /az/pipeline
                - listitem [ref=e119]:
                  - link "Vahid mesaj qutusu" [ref=e120] [cursor=pointer]:
                    - /url: /az/inbox
                - listitem [ref=e121]:
                  - link "AI satış köməkçisi" [ref=e122] [cursor=pointer]:
                    - /url: /az/ai
                - listitem [ref=e123]:
                  - link "Rezervasiya və cədvəl" [ref=e124] [cursor=pointer]:
                    - /url: /az/booking
            - generic [ref=e125]:
              - heading "Kanallar və Alətlər" [level=4] [ref=e126]
              - list [ref=e127]:
                - listitem [ref=e128]:
                  - link "WhatsApp Cloud API kanalı" [ref=e129] [cursor=pointer]:
                    - /url: /az/channels/whatsapp
                - listitem [ref=e130]:
                  - link "Instagram Direct mesajları" [ref=e131] [cursor=pointer]:
                    - /url: /az/channels/instagram
                - listitem [ref=e132]:
                  - link "Telegram Bot bağlantısı" [ref=e133] [cursor=pointer]:
                    - /url: /az/channels/telegram
                - listitem [ref=e134]:
                  - link "REST Webhook və n8n" [ref=e135] [cursor=pointer]:
                    - /url: /az/channels/webhook-api
                - listitem [ref=e136]:
                  - link "Pulsuz WhatsApp alətləri" [ref=e137] [cursor=pointer]:
                    - /url: /az/tools
            - generic [ref=e138]:
              - heading "Resurslar" [level=4] [ref=e139]
              - list [ref=e140]:
                - listitem [ref=e141]:
                  - link "Qiymət və planlar" [ref=e142] [cursor=pointer]:
                    - /url: /az/pricing
                - listitem [ref=e143]:
                  - link "Fitnes nümunə ssenarisi" [ref=e144] [cursor=pointer]:
                    - /url: /az/scenarios/fitness-centers
                - listitem [ref=e145]:
                  - link "Bələdçilər və bloq" [ref=e146] [cursor=pointer]:
                    - /url: /az/blog
            - generic [ref=e147]:
              - heading "Əlaqə və Hüquqi" [level=4] [ref=e148]
              - list [ref=e149]:
                - listitem [ref=e150]:
                  - link "İstifadə şərtləri" [ref=e151] [cursor=pointer]:
                    - /url: /az/legal/terms
                - listitem [ref=e152]:
                  - link "Məxfilik siyasəti" [ref=e153] [cursor=pointer]:
                    - /url: /az/legal/privacy
                - listitem [ref=e154]:
                  - link "İşçi paneli girişi" [ref=e155] [cursor=pointer]:
                    - /url: /az/login
        - generic [ref=e156]:
          - paragraph [ref=e157]: © 2026 panelim.az. Bütün hüquqlar qorunur.
          - link "English" [ref=e158] [cursor=pointer]:
            - /url: /en/tools
  - alert [ref=e159]
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