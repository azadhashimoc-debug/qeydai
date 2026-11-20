# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel.spec.ts >> CRM leads pipeline: create lead, update stage and note, filter, and persist across reload
- Location: tests\e2e\panel.spec.ts:191:1

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
  146 |   const project = info.project.name as ProjectName;
  147 |   const uid = makeUid(project);
  148 |   const sessionId = `s-ui-${uid}`;
  149 |   const courseId = `IELTS-${uid.slice(-6)}`;
  150 |   const studentName = `Aygün ${uid.slice(-5)}`;
  151 |   const studentPhone = makePhone(project, info.workerIndex);
  152 | 
  153 |   await signInToPanel(page, project);
  154 |   await page.getByRole("tab", { name: /Sessions/ }).click();
  155 |   await expect(page.getByRole("heading", { name: "Trial sessions schedule" })).toBeVisible();
  156 | 
  157 |   await page.getByLabel("Session ID").fill(sessionId);
  158 |   await page.getByLabel("Course name").fill(courseId);
  159 |   await page.getByLabel("Start date and time").fill(futureLocalDatetime(7));
  160 |   await page.getByLabel("Seat capacity").fill("4");
  161 |   await page.getByRole("button", { name: "Create session" }).click();
  162 | 
  163 |   await expect(page.getByText("Trial session added to schedule.")).toBeVisible();
  164 | 
  165 |   const sessionItem = page.locator("li", { hasText: sessionId });
  166 |   await expect(sessionItem).toBeVisible();
  167 |   await expect(sessionItem).toContainText(courseId);
  168 |   await expect(sessionItem).toContainText("0/4 taken");
  169 |   await expect(sessionItem).toContainText("4 seats left");
  170 |   await expect(sessionItem.getByRole("button", { name: /Show roster \(0\)/ })).toBeVisible();
  171 | 
  172 |   const enrollRes = await request.post("/api/v1/enroll", {
  173 |     headers: { authorization: `Bearer ${E2E_KEYS[project]}`, "content-type": "application/json" },
  174 |     data: { sessionId, name: studentName, phone: studentPhone },
  175 |   });
  176 |   expect(enrollRes.status()).toBe(201);
  177 | 
  178 |   await page.getByRole("button", { name: "Refresh" }).click();
  179 |   await expect(sessionItem).toContainText("1/4 taken");
  180 |   await expect(sessionItem).toContainText("3 seats left");
  181 | 
  182 |   const showRosterBtn = sessionItem.getByRole("button", { name: /Show roster \(1\)/ });
  183 |   await expect(showRosterBtn).toBeVisible();
  184 |   await showRosterBtn.click();
  185 | 
  186 |   await expect(sessionItem.getByRole("button", { name: /Hide roster \(1\)/ })).toBeVisible();
  187 |   await expect(sessionItem).toContainText(studentName);
  188 |   await expect(sessionItem).toContainText(studentPhone);
  189 | });
  190 | 
  191 | test("CRM leads pipeline: create lead, update stage and note, filter, and persist across reload", async ({
  192 |   page,
  193 | }, info) => {
  194 |   const project = info.project.name as ProjectName;
  195 |   const uid = makeUid(project);
  196 |   const leadName = `Leyla ${uid}`;
  197 |   const leadPhone = makePhone(project, info.workerIndex);
  198 |   const initialNote = `Interested in IELTS ${uid}`;
  199 |   const updatedNote = `Booked Saturday 11:00 trial (${uid})`;
  200 | 
  201 |   await signInToPanel(page, project);
  202 |   await page.getByRole("tab", { name: /CRM/ }).click();
  203 |   await expect(page.getByRole("heading", { name: "Lead register (CRM)" })).toBeVisible();
  204 | 
  205 |   await page.getByRole("button", { name: "+ New lead" }).click();
  206 |   const createSection = page.locator("section", {
  207 |     has: page.getByRole("heading", { name: "Add a new lead" }),
  208 |   });
  209 |   await expect(createSection).toBeVisible();
  210 | 
  211 |   await createSection.getByLabel("Full name").fill(leadName);
  212 |   await createSection.getByLabel("Phone number").fill(leadPhone);
  213 |   await createSection.getByLabel("Source channel").selectOption("whatsapp");
  214 |   await createSection.getByLabel("Stage").selectOption("contacted");
  215 |   await createSection.getByLabel("Note").fill(initialNote);
  216 |   await createSection.getByRole("button", { name: "Save lead" }).click();
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
> 246 |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
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
  317 |   await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
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
```