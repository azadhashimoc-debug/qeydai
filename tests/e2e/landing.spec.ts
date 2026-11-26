import { expect, test } from "@playwright/test";
import { completeWorkspaceSetup } from "./workspace-setup";
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { LEADS_FILE, ANALYTICS_FILE, E2E_ADMIN_KEYS } from "../../playwright.config";

test("root redirects by Accept-Language, default az", async ({ request }) => {
  const loc = async (h: string) =>
    (await request.get("/", { headers: { "accept-language": h }, maxRedirects: 0 })).headers()["location"];
  expect(await loc("en-US,en;q=0.9")).toMatch(/\/en$/);
  expect(await loc("az-AZ,az;q=0.9")).toMatch(/\/az$/);
  expect(await loc("ru")).toMatch(/\/az$/);
  expect(await loc("")).toMatch(/\/az$/);
});

test("language switch keeps content in sync", async ({ page }) => {
  await page.goto("/az");
  await expect(page.locator("html")).toHaveAttribute("lang", "az");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Müştəri mesajlarından satışa — hər şey bir yerdə");
  await page.getByRole("banner").getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("From customer conversations to sales — in one place");
});

test("landing header actions fit on one row at desktop widths", async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 800 });
  await page.goto("/az", { waitUntil: "networkidle" });
  const header = page.getByRole("banner");
  const demo = header.getByRole("link", { name: "Demo al", exact: true });
  const login = header.getByRole("link", { name: "Giriş", exact: true });
  const register = header.getByRole("link", { name: "Hesab yarat", exact: true });

  await expect(register).toBeVisible({ timeout: 5000 });
  await expect(register).toHaveCSS("color", "rgb(255, 255, 255)");
  const loginBox = (await login.boundingBox())!;
  const registerBox = (await register.boundingBox())!;
  expect(registerBox.height).toBeCloseTo(loginBox.height);
  expect(registerBox.height).toBeLessThanOrEqual(44);
  expect(registerBox.x).toBeGreaterThan(loginBox.x + loginBox.width);
  expect(registerBox.x + registerBox.width).toBeLessThanOrEqual(1120);
  await expect(login).toHaveAttribute("href", "/az/login");
  await expect(register).toHaveAttribute("href", "/az/register");
  await demo.click({ timeout: 5000 });
  await expect(page).toHaveURL(/\/az\/demo$/);
});

test("landing header actions remain available in the mobile menu", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/az");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Giriş", exact: true })).toHaveCount(0);
  await header.getByRole("button", { name: "Menyunu aç" }).click();
  await expect(header.getByRole("link", { name: "Demo al", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Giriş", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Hesab yarat", exact: true })).toBeVisible();
});

test("unknown locale returns 404", async ({ request }) => {
  const res = await request.get("/xx");
  expect(res.status()).toBe(404);
});

test("no horizontal scroll", async ({ page }) => {
  await page.goto("/az");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("lead form: invalid shows error, valid is stored", async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ "x-qeydai-e2e-client": `landing-lead-${info.project.name}-${info.workerIndex}` });
  const tail = info.project.name === "mobile" ? "68" : "67";
  const phone = `050 123 45 ${tail}`;
  await page.goto("/az#contact", { waitUntil: "networkidle" });
  await page.getByLabel("Adınız").fill("Aygün");
  await page.getByLabel(/^Telefon/).fill("123");
  await page.getByRole("button", { name: "Demo istə" }).last().click();
  await expect(page.getByRole("status")).toContainText("Göndərmək alınmadı");
  if (existsSync(LEADS_FILE)) expect(readFileSync(LEADS_FILE, "utf8")).not.toContain('"phone":"+994123"');

  await page.getByLabel(/^Telefon/).fill(phone);
  await page.getByRole("button", { name: "Demo istə" }).last().click();
  await expect(page.getByRole("status")).toContainText("Təşəkkürlər");
  const rows = readFileSync(LEADS_FILE, "utf8")
    .split(String.fromCharCode(10))
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  const normalizedPhone = `+9945012345${tail}`;
  expect(rows.some((r) => r.phone === normalizedPhone && r.name === "Aygün")).toBe(true);

  await page.goto("/en/login");
  await page.getByRole("button", { name: "Access key", exact: true }).click();
  await page.getByLabel("Email").fill("pilot@example.test");
  await page.getByLabel("Workspace access key").fill(E2E_ADMIN_KEYS.desktop);
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  await expect(page).toHaveURL(/\/en\/panel$/);
  await completeWorkspaceSetup(page);
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
  const leads = await page.request.get("/api/panel/leads");
  expect(leads.ok()).toBe(true);
  expect((await leads.json()).leads).toContainEqual(
    expect.objectContaining({ name: "Aygün", phone: normalizedPhone, source: "web" }),
  );
});

test("security headers are set", async ({ request }) => {
  const h = (await request.get("/az")).headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["cross-origin-opener-policy"]).toBe("same-origin");
  expect(h["cross-origin-resource-policy"]).toBe("same-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("double-slash path cannot redirect off-site", async () => {
  // Raw request: HTTP clients would treat "//host" as a protocol-relative URL before sending.
  const loc = await new Promise<string>((resolve, reject) => {
    http
      .get({ host: "localhost", port: 3100, path: "//evil.example.com" }, (res) => {
        res.resume();
        resolve(String(res.headers.location ?? ""));
      })
      .on("error", reject);
  });
  expect(loc.startsWith("//")).toBe(false);
  expect(loc === "" || loc.startsWith("/") || loc.startsWith("http://localhost:3100/")).toBe(true);
});

test("lead API rejects GET and cross-origin POST", async ({ request }) => {
  expect((await request.get("/api/lead")).status()).toBe(405);
  const res = await request.post("/api/lead", {
    data: { name: "Ali", phone: "050 123 45 67" },
    headers: { origin: "https://evil.example" },
  });
  expect(res.status()).toBe(403);
});

test("non-root paths get locale-prefixed too (proxy matcher)", async ({ request }) => {
  const loc = async (p: string, lang: string) =>
    (await request.get(p, { headers: { "accept-language": lang }, maxRedirects: 0 })).headers()["location"];
  expect(await loc("/pricing", "en")).toMatch(/\/en\/pricing$/);
  expect(await loc("/apiary", "az")).toMatch(/\/az\/apiary$/);
});

test("HSTS header is set", async ({ request }) => {
  const h = (await request.get("/az")).headers();
  expect(h["strict-transport-security"]).toContain("max-age=63072000");
});

test("lead API still excluded from locale redirect", async ({ request }) => {
  const res = await request.get("/api/lead", { maxRedirects: 0 });
  expect(res.status()).toBe(405);
});

test("accessibility & SEO: skip link, JSON-LD, canonical, robots, sitemap", async ({ page, request }) => {
  await page.goto("/az");
  await expect(page.locator('a[href="#main"]')).toBeAttached();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/az$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/az$/);

  const ldText = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ldText).toBeTruthy();
  const ld = JSON.parse(ldText!);
  const types = ld["@graph"].map((n: { "@type": string }) => n["@type"]);
  expect(types).toEqual(expect.arrayContaining(["Organization", "SoftwareApplication", "FAQPage"]));

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("/az");
  expect(xml).toContain("/en");
});

test("lead form validates empty name client-side and focuses invalid input", async ({ page }) => {
  await page.goto("/az#contact");
  await page.getByLabel("Adınız").fill("A");
  await page.getByRole("button", { name: "Demo istə" }).last().click();
  await expect(page.getByLabel("Adınız")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Adınız")).toBeFocused();
});

test("focus ring keeps 3:1 contrast: dark violet on paper, yellow on dark cover", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/az", { waitUntil: "networkidle" });
  const focusViaKeyboard = async (sel: string) => {
    const loc = page.locator(sel).first();
    await loc.scrollIntoViewIfNeeded();
    // Programmatic focus on links does not match :focus-visible; tabbing onto them does.
    await loc.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    return loc.evaluate((el: HTMLElement) => ({
      visible: el.matches(":focus-visible"),
      color: getComputedStyle(el).outlineColor,
    }));
  };
  // First Tab lands on the skip link (dark cover background -> highlighter yellow).
  await page.keyboard.press("Tab");
  const skip = await page.locator(".skip-link").evaluate((el: HTMLElement) => ({
    visible: el.matches(":focus-visible"),
    color: getComputedStyle(el).outlineColor,
  }));
  expect(skip).toEqual({ visible: true, color: "rgb(255, 228, 92)" });
  const contrastAgainstWhite = (rgb: string) => {
    const values = rgb.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
    expect(values).toHaveLength(3);
    const channels = values.map((channel) => {
      const v = channel / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    return 1.05 / (luminance + 0.05);
  };
  // Contact form input sits on a light card inside the cover section.
  const inputFocus = await focusViaKeyboard("#contact input");
  expect(inputFocus.visible).toBe(true);
  expect(contrastAgainstWhite(inputFocus.color)).toBeGreaterThanOrEqual(3);
  // Hero CTA sits on the light mesh hero.
  const heroFocus = await focusViaKeyboard('[data-track-cta="hero_primary"]');
  expect(heroFocus.visible).toBe(true);
  expect(contrastAgainstWhite(heroFocus.color)).toBeGreaterThanOrEqual(3);
  // Header language link sits on the light header.
  const langFocus = await focusViaKeyboard("[data-track-lang]");
  expect(langFocus.visible).toBe(true);
  expect(contrastAgainstWhite(langFocus.color)).toBeGreaterThanOrEqual(3);
});

test("bilingual 404 marks English copy and link with lang/hreflang", async ({ page }) => {
  // error.tsx copy is covered by unit tests (i18n-guard.test.ts); it cannot be triggered without a broken page.
  await page.goto("/xx");
  await expect(page.locator('p[lang="en"]')).toContainText("could not be found");
  await expect(page.locator('a[href="/en"]').last()).toHaveAttribute("hreflang", "en");
});

test("custom 404 renders branded page and interactive stage/pricing/AI sections work", async ({ page }) => {
  const res = await page.goto("/xx");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Səhifə tapılmadı");
  await expect(page.locator('a[href="/az"]').last()).toBeVisible();
  await expect(page.locator('a[href="/en"]').last()).toBeVisible();

  await page.goto("/az", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Satış lövhəsi" }).click();
  await expect(page.getByText("Danışıq gedir")).toBeVisible();

  await page.getByRole("button", { name: "İllik", exact: true }).click();
  await expect(page.getByRole("button", { name: "İllik", exact: true }))
    .toHaveAttribute("aria-pressed", "true");

  const contactBgPos = await page.locator("#contact > div").first().evaluate((el) => getComputedStyle(el).position);
  expect(contactBgPos).toBe("absolute");
});

test("analytics tracks page_viewed, cta_clicked, faq_toggled and lead funnel without PII", async ({ page }) => {
  await page.goto("/az?utm_source=meta&utm_medium=cpc&utm_campaign=e2e_nov");
  await page.locator('[data-track-cta="hero_secondary"]').click();
  await page.locator('[data-track-faq="q1"] summary').click();

  await expect(async () => {
    expect(existsSync(ANALYTICS_FILE)).toBe(true);
    const raw = readFileSync(ANALYTICS_FILE, "utf8");
    const rows = raw.split(String.fromCharCode(10)).filter((l) => l.trim()).map((l) => JSON.parse(l));
    expect(rows.some((r) => r.event === "page_viewed" && r.props?.utm_source === "meta" && r.props?.locale === "az")).toBe(true);
    expect(rows.some((r) => r.event === "cta_clicked" && r.props?.location === "hero_secondary")).toBe(true);
    expect(rows.some((r) => r.event === "faq_toggled" && r.props?.faq_id === "q1" && r.props?.open === true)).toBe(true);
    expect(raw).not.toMatch(/Aygün|\+994|"phone"|"name"/);
  }).toPass({ timeout: 5000 });
});

test("A/B override sets dataset & exp attribution and scroll depth fires", async ({ page }) => {
  await page.goto("/az?ab_hero_cta_v1=benefit");
  await expect(page.locator("html")).toHaveAttribute("data-exp-hero-cta", "benefit");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(async () => {
    const raw = readFileSync(ANALYTICS_FILE, "utf8");
    const rows = raw.split(String.fromCharCode(10)).filter((l) => l.trim()).map((l) => JSON.parse(l));
    expect(rows.some((r) => r.event === "page_viewed" && r.props?.exp === "hero_cta_v1:benefit")).toBe(true);
    expect(rows.some((r) => r.event === "scroll_depth_reached" && r.props?.depth === 100)).toBe(true);
  }).toPass({ timeout: 5000 });
});
