import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Exercise the current four-step workspace wizard, including the real datalist
 * text input (not a select), goal/connection choices and team-size radio.
 * Finish on Overview so downstream tests can assert a visible authenticated UI.
 */
export async function completeWorkspaceSetup(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Tell us about your business" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);

  const next = dialog.getByRole("button", { name: "Continue" });
  await expect(next).toBeDisabled();
  await dialog.getByLabel("Industry").fill("Education");
  await dialog.getByLabel("Your role").selectOption({ label: "Owner / founder" });
  await dialog.getByLabel("Business name (optional)").fill("Panelim Test");
  await expect(next).toBeEnabled();
  await next.click();

  await expect(dialog.getByRole("heading", { name: "What are your goals?" })).toBeVisible();
  await expect(next).toBeDisabled();
  await dialog.getByLabel("Track reports").check();
  await next.click();

  await expect(dialog.getByRole("heading", { name: "Where do your leads come from?" })).toBeVisible();
  await dialog.getByLabel("No channels yet").check();
  await next.click();

  await expect(dialog.getByRole("heading", { name: "How many people are on your team?" })).toBeVisible();
  await dialog.getByRole("radio", { name: "Just me" }).check();
  await dialog.getByRole("button", { name: "Finish and open workspace" }).click();
  await expect(dialog).toHaveCount(0);
}
