import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function completeWorkspaceSetup(page: Page) {
  const dialog = page.getByRole("dialog");

  // Step 1: Avatar, support preference & phone number
  await expect(page.getByRole("dialog", { name: "Let's make Panelim yours" })).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Next" })).toBeDisabled();
  await dialog.getByLabel("Phone number").fill("50 123 45 67");
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 2: Industry, conditional business type & role
  await expect(page.getByRole("dialog", { name: "Let's customize your workspace" })).toBeVisible();
  await dialog.getByLabel("Select industry").selectOption({ label: "Education" });
  await dialog.getByLabel("Your business type").selectOption({ label: "Language classes" });
  await dialog.getByLabel("Select your role").selectOption({ label: "Owner / founder / CEO" });
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 3: Goals (max 2)
  await expect(page.getByRole("dialog", { name: "What are your goals?" })).toBeVisible();
  await dialog.getByLabel("Manage leads from ad campaigns").check();
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 4: Lead sources
  await expect(page.getByRole("dialog", { name: "Where do your leads come from?" })).toBeVisible();
  await dialog.getByLabel("WhatsApp").check();
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 5: Team size (single-click auto-advance)
  await expect(page.getByRole("dialog", { name: "How many team members will use Panelim?" })).toBeVisible();
  await dialog.getByRole("button", { name: "Just me" }).click();

  // Step 6: Business details
  await expect(page.getByRole("dialog", { name: "Tell us about your business" })).toBeVisible();
  await dialog.getByLabel("Your company name").fill("Panelim Test");
  await dialog.getByLabel("Website or social media").fill("panelim.az");
  await dialog.getByRole("button", { name: "Next" }).click();
}
