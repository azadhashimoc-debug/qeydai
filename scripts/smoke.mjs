// Post-deploy smoke test. Usage: node scripts/smoke.mjs https://your-domain
// Read-only: no secrets needed. Exits 1 on the first failed check.
const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("usage: node scripts/smoke.mjs https://your-domain");
  process.exit(2);
}

const checks = [
  ["home (az)", "/az", (r) => r.status === 200],
  ["home (en)", "/en", (r) => r.status === 200],
  ["sector page", "/az/scenarios/clinics", (r) => r.status === 200],
  // With cacheComponents the 404 is streamed after headers, so the status can be 200; noindex must be present then.
  ["unknown sector is 404 or noindex", "/az/scenarios/nope", (r, body) => r.status === 404 || /<meta name="robots" content="noindex"/.test(body)],
  ["health endpoint", "/api/health", (r, body) => r.status === 200 && /"ok":true/.test(body)],
  ["sitemap", "/sitemap.xml", (r) => r.status === 200],
  ["robots", "/robots.txt", (r) => r.status === 200],
  ["security headers", "/az", (r) => r.headers.has("strict-transport-security") && r.headers.get("x-frame-options") === "DENY"],
  ["no x-powered-by", "/az", (r) => !r.headers.has("x-powered-by")],
  ["panel API requires auth", "/api/panel/ai", (r) => r.status === 401 || r.status === 403],
  ["deliver endpoint rejects anonymous", "/api/channels/deliver", (r) => r.status === 401 || r.status === 403 || r.status === 405, { method: "POST" }],
  ["meta verify rejects bad token", "/api/channels/whatsapp?hub.mode=subscribe&hub.challenge=x&hub.verify_token=wrong", (r) => r.status === 403],
];

let failed = 0;
for (const [name, path, ok, init] of checks) {
  try {
    const res = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(15000), ...init });
    const pass = ok(res, await res.text());
    console.log(`${pass ? "PASS" : "FAIL"}  ${name} (${res.status})`);
    if (!pass) failed++;
  } catch (error) {
    console.log(`FAIL  ${name} (${error instanceof Error ? error.message : "error"})`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
