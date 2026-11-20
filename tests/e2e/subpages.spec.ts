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
  const tail = info.project.name === "mobile" ? "91" : "92";
  await page.goto("/az/demo");
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

  await page.getByLabel("Workspace access key").fill(E2E_ADMIN_KEYS[project]);
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  await expect(page).toHaveURL(/\/en\/panel$/);
  await completeWorkspaceSetup(page);
  await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
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
