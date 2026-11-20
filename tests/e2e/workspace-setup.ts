import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function completeWorkspaceSetup(page: Page) {
  await expect(page.getByRole("dialog", { name: "Your business" })).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByLabel("Business name").fill("Panelim Test");
  await page.getByLabel("Industry").selectOption({ label: "Education" });
  await page.getByLabel("Your role").selectOption({ label: "Owner / founder" });
  await page.getByLabel("Team size").selectOption("1");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Track reports").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("No channel yet").check();
  await page.getByRole("button", { name: "Complete setup" }).click();
}
