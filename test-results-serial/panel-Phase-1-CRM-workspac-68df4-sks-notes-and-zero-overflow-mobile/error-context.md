# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel.spec.ts >> Phase 1 CRM: workspace settings, stages, custom fields, members, contacts, deals, claim, tasks, notes, and zero overflow
- Location: tests\e2e\panel.spec.ts:439:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('tab', { name: /Contacts/ })

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - alert [ref=f1e2]
  - link "Skip to main content" [ref=f1e3] [cursor=pointer]:
    - /url: "#main"
  - generic [ref=f1e4]:
    - banner [ref=f1e5]:
      - navigation "Panel navigation" [ref=f1e6]:
        - link "panelim.az" [ref=f1e7] [cursor=pointer]:
          - /url: /en
        - generic [ref=f1e13]:
          - 'link "Language: AZ" [ref=f1e14] [cursor=pointer]':
            - /url: /az/panel
            - text: az
          - link "Back to site" [ref=f1e15] [cursor=pointer]:
            - /url: /en
    - main [ref=f1e16]:
      - generic [ref=f1e17]:
        - generic [ref=f1e18]:
          - paragraph [ref=f1e19]: Learning center register
          - generic [ref=f1e20]: Staff panel
        - heading "Staff panel sign in" [level=1] [ref=f1e21]
        - paragraph [ref=f1e22]: Enter your center admin key to manage trial sessions, leads, and conversations.
        - generic [ref=f1e23]:
          - generic [ref=f1e24]:
            - generic [ref=f1e25]: Username
            - textbox "Username" [ref=f1e27]:
              - /placeholder: user@example.com
          - generic [ref=f1e28]:
            - generic [ref=f1e29]: Access key
            - generic [ref=f1e30]:
              - textbox "Access key" [ref=f1e31]:
                - /placeholder: Enter your center admin key
              - button "Show key" [ref=f1e32]
          - button "Sign in to panel" [ref=f1e33]
          - status [ref=f1e34]: Session is stored in a secure HttpOnly cookie.
```

# Test source

```ts
  464 |     has: page.getByRole("heading", { name: "Pipeline stages" }),
  465 |   });
  466 |   await stagesSection.getByLabel("New stage name").fill(stageName);
  467 |   await stagesSection.getByRole("button", { name: "Add stage" }).click();
  468 |   const stageItem = stagesSection.locator("li", { hasText: stageName });
  469 |   await expect(stageItem).toBeVisible();
  470 | 
  471 |   await stageItem.getByRole("button", { name: "Rename" }).click();
  472 |   await stagesSection.getByLabel("Rename").fill(renamedStageName);
  473 |   await stagesSection.getByRole("button", { name: "Save changes" }).click();
  474 |   await expect(stagesSection.locator("li", { hasText: renamedStageName })).toBeVisible();
  475 | 
  476 |   await page.getByLabel("Field name").fill(fieldName);
  477 |   await page.getByLabel("Field type").selectOption("number");
  478 |   await page.getByRole("button", { name: "Add field" }).click();
  479 |   await expect(page.locator("li", { hasText: fieldName })).toBeVisible();
  480 | 
  481 |   await page.getByLabel("Member ID").fill(memberId);
  482 |   await page.getByLabel("Member name").fill(memberName);
  483 |   await page.getByLabel("Role").selectOption("operator");
  484 |   await page.getByRole("button", { name: "Add member" }).click();
  485 |   await expect(page.locator("li", { hasText: memberName })).toBeVisible();
  486 | 
  487 |   // 2. Contacts tab: create contact with unformatted phone -> canonical +994...
  488 |   await page.getByRole("tab", { name: /Contacts/ }).click();
  489 |   await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
  490 |   await page.getByRole("button", { name: "New contact" }).click();
  491 |   await page.getByLabel("Full name").fill(contactName);
  492 |   await page.getByLabel("Phone number").fill(localPhoneInput);
  493 |   await page.getByRole("button", { name: "Save contact" }).click();
  494 |   await expect(page.getByRole("heading", { name: contactName })).toBeVisible();
  495 |   await expect(page.getByText(rawPhone).first()).toBeVisible();
  496 | 
  497 |   // 3. Deals tab: create deal, claim, move stage, open detail
  498 |   await page.getByRole("tab", { name: /Deals/ }).click();
  499 |   await expect(page.getByRole("heading", { name: "Sales pipeline" })).toBeVisible();
  500 |   await page.getByRole("button", { name: "New deal" }).click();
  501 | 
  502 |   const createSection = page.getByRole("region", { name: "Create new deal" });
  503 |   await createSection.getByLabel("Deal title").fill(dealTitle);
  504 |   await createSection.getByLabel("Contact", { exact: true }).selectOption({ label: `${contactName} (${rawPhone})` });
  505 |   await createSection.getByLabel("Amount").fill("180");
  506 |   await createSection.getByRole("button", { name: "Create deal" }).click();
  507 | 
  508 |   // Verify on Kanban, then switch to List view and interact
  509 |   await expect(page.getByText(dealTitle).first()).toBeVisible();
  510 |   await page.getByRole("button", { name: "List" }).click();
  511 |   await page.getByLabel("Search deals").fill(dealTitle);
  512 | 
  513 |   const dealCard = page.locator("article", { hasText: dealTitle });
  514 |   await expect(dealCard).toBeVisible();
  515 |   await dealCard.getByRole("button", { name: "Claim" }).click();
  516 |   await expect(dealCard.getByRole("button", { name: "Claim" })).toHaveCount(0);
  517 | 
  518 |   await dealCard.getByLabel("Move deal to stage").selectOption({ label: renamedStageName });
  519 | 
  520 |   // 4. Verify in-use stage deletion returns 409 conflict banner
  521 |   await page.getByRole("tab", { name: /Team & Pipeline/ }).click();
  522 |   const inUseStage = page.locator("li", { hasText: renamedStageName });
  523 |   await inUseStage.getByRole("button", { name: "Delete" }).click();
  524 |   await expect(page.getByText("Stage has existing deals and cannot be deleted.")).toBeVisible();
  525 | 
  526 |   // 5. Deal Detail: tasks, notes, custom fields, timeline
  527 |   await page.getByRole("tab", { name: /Deals/ }).click();
  528 |   await page.getByLabel("Search deals").fill(dealTitle);
  529 |   await page.locator("article", { hasText: dealTitle }).getByRole("button", { name: "Open" }).click();
  530 |   await expect(page.getByRole("heading", { name: dealTitle })).toBeVisible();
  531 | 
  532 |   await page.getByRole("button", { name: /Tasks & Notes/ }).click();
  533 |   await page.getByLabel("Task title").fill(taskTitle);
  534 |   await page.getByRole("button", { name: "Add task" }).click();
  535 |   const taskItem = page.locator("li", { hasText: taskTitle });
  536 |   await expect(taskItem).toBeVisible();
  537 |   await taskItem.getByRole("button", { name: "Mark done" }).click();
  538 |   await expect(taskItem.getByRole("button", { name: "Reopen" })).toBeVisible();
  539 | 
  540 |   await page.getByLabel("New note").fill(noteBody);
  541 |   await page.getByRole("button", { name: "Add note" }).click();
  542 |   await expect(page.locator("li", { hasText: noteBody })).toBeVisible();
  543 | 
  544 |   await page.getByRole("button", { name: "Custom Fields" }).click();
  545 |   await page.getByLabel(fieldName).fill("7.5");
  546 |   await page.getByRole("button", { name: "Save fields" }).click();
  547 |   await expect(page.getByText("Custom fields saved.")).toBeVisible();
  548 | 
  549 |   await page.getByRole("button", { name: "Timeline & Reply" }).click();
  550 |   await expect(page.getByText("Stage updated")).toBeVisible();
  551 |   await expect(page.getByText("Task completed")).toBeVisible();
  552 | 
  553 |   // 6. Responsive + light/dark overflow check across CRM tabs
  554 |   for (const scheme of ["light", "dark"] as const) {
  555 |     await page.emulateMedia({ colorScheme: scheme });
  556 |     const noOverflow = await page.evaluate(
  557 |       () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  558 |     );
  559 |     expect(noOverflow, `Expected no horizontal overflow on DealDetail in ${scheme} mode`).toBe(true);
  560 |   }
  561 | 
  562 |   // Reload and confirm persistence in Contacts linked deals
  563 |   await page.reload();
> 564 |   await page.getByRole("tab", { name: /Contacts/ }).click();
      |                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  565 |   await page.getByLabel("Search contacts").fill(contactName);
  566 |   await page.getByRole("button", { name: new RegExp(contactName) }).click();
  567 |   await expect(page.locator("li", { hasText: dealTitle })).toBeVisible();
  568 | });
  569 | 
  570 | 
```