import { expect, test } from "@playwright/test";
import { completeWorkspaceSetup } from "./workspace-setup";
import { existsSync, readFileSync } from "node:fs";
import { E2E_ADMIN_KEYS, LEADS_FILE } from "../../playwright.config";

type ProjectName = "desktop" | "mobile";

const ALL_SUBPAGE_PATHS = [
  "/az/product",
  "/az/pipeline",
  "/az/inbox",
  "/az/ai",
  "/az/booking",
  "/az/channels",
  "/az/channels/whatsapp",
  "/az/channels/instagram",
  "/az/channels/telegram",
  "/az/channels/webhook-api",
  "/az/tools",
  "/az/scenarios/fitness-centers",
  "/az/industries",
  "/az/industries/clinic",
  "/az/integrations",
  "/az/partners",
  "/az/cases",
  "/az/cases/retail",
  "/az/cases/education",
  "/az/ai/agent",
  "/az/ai/analyst",
  "/az/ai/copilot",
  "/az/ai/multi-agents",
  "/az/channels/tiktok",
  "/az/channels/whatsapp-broadcast",
  "/en/integrations",
  "/az/industries/beauty",
  "/az/industries/real-estate",
  "/az/industries/retail",
  "/az/industries/education",
  "/en/industries/clinic",
  "/az/blog",
  "/az/blog/whatsapp-automation",
  "/az/pricing",
  "/az/demo",
  "/az/contact",
  "/az/login",
  "/az/register",
  "/az/select-account",
  "/az/legal/terms",
  "/az/legal/privacy",
];

test("all subpages render HTTP 200 with h1 and zero horizontal overflow", async ({ page }) => {
  test.slow();
  for (const path of ALL_SUBPAGE_PATHS) {
    const res = await page.goto(path);
    expect(res?.status(), `status for ${path}`).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }), `h1 on ${path}`).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test("unknown channel or blog slugs return 404", async ({ request }) => {
  expect((await request.get("/az/channels/shopify")).status()).toBe(404);
  expect((await request.get("/az/blog/unknown")).status()).toBe(404);
  expect((await request.get("/en/channels/constructor")).status()).toBe(404);
  expect((await request.get("/az/industries/unknown")).status()).toBe(404);
  expect((await request.get("/az/cases/unknown")).status()).toBe(404);
  expect((await request.get("/az/ai/unknown")).status()).toBe(404);
});

test("WhatsApp tools workbench builds links, blocks unsafe QR, estimates fees, and switches locale", async ({
  page,
}) => {
  await page.goto("/az/tools");
  await expect(page.locator("html")).toHaveAttribute("lang", "az");

  await page.locator("#wa-phone").fill("050 123 45 67");
  await page.locator("#wa-message").fill("Salam, kurslar haqqında məlumat almaq istəyirəm");
  await expect(page.locator('[data-testid="wa-link-output"]')).toContainText("https://wa.me/994501234567?text=");

  await page.getByRole("tab", { name: "QR Kod Yaradıcı" }).click();
  await page.locator("#qr-url").fill("javascript:alert(1)");
  await expect(page.locator(".pm-error-note")).toBeVisible();
  await page.locator("#qr-url").fill("https://wa.me/994501234567");
  await expect(page.locator(".pm-qr-preview svg")).toBeVisible();

  await page.getByRole("tab", { name: "Xərc Kalkulyatoru" }).click();
  await page.locator("#calc-marketing").fill("1000");
  await page.locator("#calc-utility").fill("0");
  await page.locator("#calc-auth").fill("0");
  await expect(page.locator(".pm-calc-total strong")).toContainText("$45.00");

  await page.locator('[data-track-lang="en"]').click();
  await expect(page).toHaveURL(/\/en\/tools$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("demo page submits lead form cleanly", async ({ page }, info) => {
  // The real 5-requests-per-client limiter remains active; requests from
  // independent E2E flows must not share one synthetic localhost identity.
  await page.setExtraHTTPHeaders({ "x-qeydai-e2e-client": `demo-form-${info.project.name}-${info.workerIndex}` });
  const tail = info.project.name === "mobile" ? "91" : "92";
  await page.goto("/az/demo", { waitUntil: "networkidle" });
  await page.getByLabel("Adınız").fill("Nigar");
  await page.getByLabel(/^Telefon/).fill(`055 234 56 ${tail}`);
  await page.getByRole("button", { name: "Demo görüşü təyin et" }).click();
  await expect(page.getByRole("status")).toHaveText("Təşəkkür edirik!");
  if (existsSync(LEADS_FILE)) {
    const content = readFileSync(LEADS_FILE, "utf8");
    expect(content).toContain(`+9945523456${tail}`);
  }
});

test("standalone login signs into panel and register page links back to login", async ({ page }, info) => {
  const project = info.project.name as ProjectName;
  await page.goto("/en/register");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const email = page.locator('input[type="email"]');
  const phone = page.locator('input[type="tel"]');
  const create = page.locator('form button[type="submit"]');
  await expect(phone).toBeHidden();
  await email.fill("invalid-email");
  await create.click();
  await expect(phone).toBeHidden();
  await email.fill("pilot@example.test");
  await expect(phone).toBeHidden();
  await create.click();
  await expect(phone).toBeVisible();
  await page.getByRole("link", { name: "Sign in to your panel" }).click();
  await expect(page).toHaveURL(/\/en\/login$/);

  await page.getByRole("button", { name: "Access key", exact: true }).click();
  await page.getByLabel("Workspace access key").fill(E2E_ADMIN_KEYS[project]);
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  await expect(page).toHaveURL(/\/en\/panel$/);
  await completeWorkspaceSetup(page);
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
});

test("email account: register creates a workspace, then sign out and sign in with email and password", async ({ page }, info) => {
  // Email accounts live in PostgreSQL (panel_accounts). This SQLite-backed run cannot register; tests/e2e-pg covers it.
  test.skip(!process.env.QEYDAI_DATABASE_URL, "needs QEYDAI_DATABASE_URL");
  const email = `owner-${info.project.name}-${Date.now()}@example.test`;
  const password = "Sifre-2026-e2e";
  await page.goto("/en/register");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('form button[type="submit"]').click();
  await page.locator('input[name="name"]').fill("E2E Salon");
  await page.locator('input[type="tel"]').fill(`055 987 65 ${info.project.name === "mobile" ? "41" : "42"}`);
  await page.locator('input[name="password"]').fill("short");
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole("status")).toContainText("at least 10 characters");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole("button", { name: /Open Live CRM Panel/ })).toBeVisible();
  // Full navigation: the client-side route change keeps the hidden register form in the DOM.
  await page.goto("/en/panel");
  await completeWorkspaceSetup(page);
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/en/login");
  await page.locator('input[type="email"]').fill(email);
  await page.getByLabel("Workspace access key").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  await expect(page).toHaveURL(/\/en\/login$/);
  await page.getByLabel("Workspace access key").fill(password);
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  await expect(page).toHaveURL(/\/en\/panel$/);
});

test("sitemap includes localized subpage URLs", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain("/az/product");
  expect(xml).toContain("/en/channels/whatsapp");
  expect(xml).toContain("/az/tools");
  expect(xml).toContain("/en/blog/whatsapp-automation");
});

test("Kommo adapted modals, live-chat launcher, currency switcher, and auth flows work end-to-end", async ({
  page,
}) => {
  await page.goto("/az");

  // Cookie consent notification & accept
  const cookieAccept = page.locator(".js-control-cookies-close-button");
  await expect(cookieAccept).toBeVisible();
  await cookieAccept.click();
  await expect(cookieAccept).toBeHidden();

  // Pricing currency switcher & Enterprise modal trigger
  const currencyBtn = page.locator(".js-currencies-button");
  await currencyBtn.click();
  await expect(page.locator(".js-currencies-popup")).toBeVisible();
  await page.getByRole("menuitem", { name: /USD/ }).click();
  await expect(page.locator("#pricing")).toContainText("$");

  const entTrigger = page.locator(".js-enterprise-request-trigger");
  await entTrigger.click();
  await expect(page.locator(".js-enterprise-request-modal")).toBeVisible();
  await page.locator(".js-modal-close-button").click();
  await expect(page.locator(".js-enterprise-request-modal")).toBeHidden();

  // Multi-channel floating live-chat & 2-step Partner modal
  await page.locator(".js-amo-button").click();
  await expect(page.locator("#amo-livechat")).toBeVisible();
  await page.getByRole("button", { name: /Partner yardımı tələb et/ }).click();
  await expect(page.locator(".js-find-partner-form-step-1")).toBeVisible();
  await page.locator(".js-modal-close-button").click();

  // Both email/password and legacy keys are supported. Explicitly choose key mode. OAuth buttons are
  // informational until OAuth is configured; no mock social login may mint a
  // panel session. Verify the actual key form, security feedback and support link.
  await page.goto("/az/login");
  await expect(page.getByRole("heading", { name: "Daxil ol" })).toBeVisible();
  await page.getByRole("button", { name: "Giriş açarı", exact: true }).click();
  const keyField = page.getByLabel("İş sahəsi açarı");
  await expect(keyField).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Göstər" }).click();
  await expect(keyField).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Gizlət" }).click();
  await expect(keyField).toHaveAttribute("type", "password");

  await page.getByRole("link", { name: "Google ilə daxil ol" }).click();
  await expect(page.getByRole("status")).toContainText("OAuth");
  await expect(page).toHaveURL(/\/az\/login(\?oauth_error=unavailable)?$/);
  expect((await page.request.get("/api/panel/overview")).status()).toBe(401);

  // The OAuth redirect reloads the login page in its default mode; choose key mode again.
  await page.getByRole("button", { name: "Giriş açarı", exact: true }).click();
  await keyField.fill("invalid-workspace-key-0123456789abcdef");
  await page.getByRole("button", { name: "Giriş", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Daxil edilən açar yanlışdır");
  await expect(keyField).toHaveAttribute("aria-invalid", "true");
  await page.locator(".pm-auth-forgot-link").click();
  await expect(page).toHaveURL(/\/az\/forgot-password$/);
});
