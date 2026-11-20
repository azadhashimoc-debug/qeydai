# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel.spec.ts >> unified inbox: staff reply, simulated student message, M2M AI sync, order and mobile threads
- Location: tests\e2e\panel.spec.ts:255:1

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
- alert
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
```

# Test source

```ts
  217 | 
  218 |   await expect(createSection.getByRole("status")).toHaveText("Lead added to the register.");
  219 | 
  220 |   const leadCard = page.locator("li", { hasText: leadName });
  221 |   await expect(leadCard).toBeVisible();
  222 |   await expect(leadCard).toContainText(leadPhone);
  223 |   await expect(leadCard).toContainText("WhatsApp");
  224 |   await expect(leadCard).toContainText("Contacted");
  225 | 
  226 |   await leadCard.getByLabel("Change lead stage").selectOption("trial_booked");
  227 |   await expect(leadCard.getByRole("status")).toHaveText("Changes saved.");
  228 |   await expect(leadCard.getByLabel("Change lead stage")).toHaveValue("trial_booked");
  229 | 
  230 |   await leadCard.getByLabel("Note").fill(updatedNote);
  231 |   await leadCard.getByRole("button", { name: "Save note" }).click();
  232 |   await expect(leadCard.getByRole("button", { name: "Save note" })).toBeDisabled();
  233 |   await expect(leadCard.getByRole("status")).toHaveText("Changes saved.");
  234 | 
  235 |   await page.getByLabel("Filter by stage").selectOption("lost");
  236 |   await expect(leadCard).toHaveCount(0);
  237 | 
  238 |   await page.getByLabel("Filter by stage").selectOption("trial_booked");
  239 |   await page.getByLabel("Search").fill(leadName);
  240 |   await expect(leadCard).toBeVisible();
  241 | 
  242 |   await page.getByLabel("Search").fill(`missing-${uid}`);
  243 |   await expect(leadCard).toHaveCount(0);
  244 | 
  245 |   await page.reload();
  246 |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
  247 |   await page.getByRole("tab", { name: /CRM/ }).click();
  248 | 
  249 |   await page.getByLabel("Search").fill(leadName);
  250 |   await expect(leadCard).toBeVisible();
  251 |   await expect(leadCard.getByLabel("Change lead stage")).toHaveValue("trial_booked");
  252 |   await expect(leadCard.getByLabel("Note")).toHaveValue(updatedNote);
  253 | });
  254 | 
  255 | test("unified inbox: staff reply, simulated student message, M2M AI sync, order and mobile threads", async ({
  256 |   page,
  257 |   request,
  258 | }, info) => {
  259 |   const project = info.project.name as ProjectName;
  260 |   const uid = makeUid(project);
  261 |   const leadName = `Murad ${uid}`;
  262 |   const leadPhone = makePhone(project, info.workerIndex);
  263 | 
  264 |   const seedRes = await request.post("/api/v1/leads", {
  265 |     headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
  266 |     data: { name: leadName, phone: leadPhone, source: "telegram" },
  267 |   });
  268 |   expect(seedRes.status()).toBe(201);
  269 |   const { leadId } = (await seedRes.json()) as { ok: true; leadId: string };
  270 | 
  271 |   await signInToPanel(page, project);
  272 |   await page.getByRole("tab", { name: /CRM/ }).click();
  273 |   await page.getByLabel("Search").fill(leadName);
  274 | 
  275 |   const leadCard = page.locator("li", { hasText: leadName });
  276 |   await expect(leadCard).toBeVisible();
  277 |   await leadCard.getByRole("button", { name: "Open in Inbox" }).click();
  278 | 
  279 |   await expect(page.getByRole("tab", { name: /Inbox/ })).toHaveAttribute("aria-selected", "true");
  280 |   const convSection = page.getByRole("region", { name: leadName });
  281 |   await expect(convSection).toBeVisible();
  282 |   await expect(convSection.getByText("No messages with this lead yet. Send the first message below.")).toBeVisible();
  283 | 
  284 |   if (project === "mobile") {
  285 |     await convSection.getByRole("button", { name: /All threads/ }).click();
  286 |     const mobileThreads = page.getByRole("complementary", { name: "Threads" });
  287 |     await expect(mobileThreads).toBeVisible();
  288 |     await mobileThreads.getByPlaceholder("Type name or phone").fill(leadName);
  289 |     await mobileThreads.getByRole("button", { name: new RegExp(leadName) }).click();
  290 |     await expect(convSection).toBeVisible();
  291 |   }
  292 | 
  293 |   const staffMsg = `1-Staff: Salam ${uid}`;
  294 |   await expect(convSection.getByRole("button", { name: "Staff reply" })).toHaveAttribute("aria-pressed", "true");
  295 |   await convSection.getByLabel("Message").fill(staffMsg);
  296 |   await convSection.getByRole("button", { name: "Send" }).click();
  297 |   await expect(convSection.locator("article", { hasText: staffMsg })).toBeVisible();
  298 | 
  299 |   const studentMsg = `2-Student: Qiymət nə qədərdir? ${uid}`;
  300 |   await convSection.getByRole("button", { name: "Student message (demo)" }).click();
  301 |   await expect(convSection.getByRole("button", { name: "Student message (demo)" })).toHaveAttribute(
  302 |     "aria-pressed",
  303 |     "true",
  304 |   );
  305 |   await convSection.getByLabel("Message").fill(studentMsg);
  306 |   await convSection.getByRole("button", { name: "Send" }).click();
  307 |   await expect(convSection.locator("article", { hasText: studentMsg })).toBeVisible();
  308 | 
  309 |   const aiMsg = `3-AI: IELTS 180 AZN, şənbə 11:00 sınaq dərsi var. ${uid}`;
  310 |   const aiRes = await request.post("/api/v1/messages", {
  311 |     headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
  312 |     data: { leadId, body: aiMsg, sender: "ai", direction: "out", channel: "telegram" },
  313 |   });
  314 |   expect(aiRes.status()).toBe(201);
  315 | 
  316 |   await page.reload();
> 317 |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
  318 |   await page.getByRole("tab", { name: /Inbox/ }).click();
  319 | 
  320 |   const threadsAside = page.getByRole("complementary", { name: "Threads" });
  321 |   await expect(threadsAside).toBeVisible();
  322 |   await threadsAside.getByPlaceholder("Type name or phone").fill(leadName);
  323 |   await threadsAside.getByRole("button", { name: new RegExp(leadName) }).click();
  324 | 
  325 |   const reloadedConv = page.getByRole("region", { name: leadName });
  326 |   await expect(reloadedConv).toBeVisible();
  327 | 
  328 |   const messages = reloadedConv.locator("article");
  329 |   await expect(messages).toHaveCount(3);
  330 |   await expect(messages.nth(0)).toContainText("Staff");
  331 |   await expect(messages.nth(0)).toContainText(staffMsg);
  332 |   await expect(messages.nth(1)).toContainText("Student");
  333 |   await expect(messages.nth(1)).toContainText(studentMsg);
  334 |   await expect(messages.nth(2)).toContainText("AI assistant");
  335 |   await expect(messages.nth(2)).toContainText(aiMsg);
  336 | });
  337 | 
  338 | test("overview analytics, KPI cards, funnel sections, and zero horizontal overflow in light and dark mode", async ({
  339 |   page,
  340 |   request,
  341 | }, info) => {
  342 |   const project = info.project.name as ProjectName;
  343 |   const uid = makeUid(project);
  344 |   const sesId = `s-ov-${uid}`;
  345 |   const phone = makePhone(project, info.workerIndex);
  346 | 
  347 |   expect(
  348 |     (
  349 |       await request.post("/api/v1/sessions", {
  350 |         headers: { authorization: `Bearer ${E2E_ADMIN_KEYS[project]}`, "content-type": "application/json" },
  351 |         data: { id: sesId, courseId: "Math", startsAt: FUTURE_ISO, capacity: 5 },
  352 |       })
  353 |     ).status(),
  354 |   ).toBe(201);
  355 | 
  356 |   expect(
  357 |     (
  358 |       await request.post("/api/v1/enroll", {
  359 |         headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
  360 |         data: { sessionId: sesId, name: `OV ${uid}`, phone },
  361 |       })
  362 |     ).status(),
  363 |   ).toBe(201);
  364 | 
  365 |   const leadRes = await request.post("/api/v1/leads", {
  366 |     headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
  367 |     data: { name: `OV Lead ${uid}`, phone, source: "web", stage: "paid" },
  368 |   });
  369 |   expect(leadRes.status()).toBe(201);
  370 |   const { leadId } = (await leadRes.json()) as { ok: true; leadId: string };
  371 | 
  372 |   expect(
  373 |     (
  374 |       await request.post("/api/v1/messages", {
  375 |         headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
  376 |         data: { leadId, body: `Overview ping ${uid}`, sender: "student", direction: "in", channel: "web" },
  377 |       })
  378 |     ).status(),
  379 |   ).toBe(201);
  380 | 
  381 |   const pageErrors: Error[] = [];
  382 |   page.on("pageerror", (err) => pageErrors.push(err));
  383 | 
  384 |   await signInToPanel(page, project);
  385 |   await page.getByRole("tab", { name: /Sessions/ }).click();
  386 |   await page.getByRole("tab", { name: /Overview/ }).click();
  387 | 
  388 |   const kpiSection = page.getByRole("region", { name: "Today at a glance" });
  389 |   await expect(kpiSection.getByText("Total leads")).toBeVisible();
  390 |   await expect(kpiSection.getByText("Trial bookings")).toBeVisible();
  391 |   await expect(kpiSection.getByText("Paid students")).toBeVisible();
  392 |   await expect(kpiSection.getByText("Total messages")).toBeVisible();
  393 | 
  394 |   const kpiCards = kpiSection.locator("article");
  395 |   await expect(kpiCards).toHaveCount(4);
  396 |   for (const card of await kpiCards.all()) {
  397 |     const val = Number((await card.locator("p.font-hand").textContent())?.trim());
  398 |     expect(val).toBeGreaterThanOrEqual(1);
  399 |   }
  400 | 
  401 |   await expect(page.getByRole("heading", { name: "CRM pipeline breakdown" })).toBeVisible();
  402 |   await expect(page.getByRole("heading", { name: "Trial session occupancy" })).toBeVisible();
  403 |   await expect(page.getByRole("heading", { name: "Landing funnel analytics" })).toBeVisible();
  404 |   await expect(page.getByText("Page views")).toBeVisible();
  405 |   await expect(page.getByText("CTA clicks")).toBeVisible();
  406 |   await expect(page.getByText("Form started")).toBeVisible();
  407 |   await expect(page.getByText("Form submitted")).toBeVisible();
  408 |   await expect(page.getByText("Failed submits")).toBeVisible();
  409 |   await expect(page.getByRole("heading", { name: "Views by language" })).toBeVisible();
  410 | 
  411 |   for (const scheme of ["light", "dark"] as const) {
  412 |     await page.emulateMedia({ colorScheme: scheme });
  413 |     const noOverflow = await page.evaluate(
  414 |       () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  415 |     );
  416 |     expect(noOverflow, `Expected no horizontal overflow in ${scheme} mode`).toBe(true);
  417 |   }
```