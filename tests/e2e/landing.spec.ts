import { expect, test } from "@playwright/test";
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { LEADS_FILE } from "../../playwright.config";

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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hər müraciət qeydiyyata çevrilsin");
  await page.getByRole("link", { name: /EN$/ }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Turn every inquiry into an enrollment");
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
  const tail = info.project.name === "mobile" ? "68" : "67";
  const phone = `050 123 45 ${tail}`;
  await page.goto("/az#contact");
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
  expect(rows.some((r) => r.phone === `+9945012345${tail}` && r.name === "Aygün")).toBe(true);
});

test("security headers are set", async ({ request }) => {
  const h = (await request.get("/az")).headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
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
