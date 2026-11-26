// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PanelSettings } from "./PanelSettings";

const key = "panelim:profile:example:member-1";

function renderSettings(lang: "az" | "en" = "en") {
  return render(<PanelSettings lang={lang} tenantId="example" memberId="member-1" onNavigate={() => {}}>
    {(section) => <h2>{section === "members" ? "Existing members form" : "Existing workspace form"}</h2>}
  </PanelSettings>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it("opens the security explanation and routes to existing workspace and member views", () => {
  renderSettings();
  fireEvent.click(screen.getByRole("button", { name: "Profile security" }));
  expect(screen.getByRole("heading", { name: "Profile security" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Workspace settings" }));
  expect(screen.getByRole("heading", { name: "Existing workspace form" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "User management" }));
  expect(screen.getByRole("heading", { name: "Existing members form" })).toBeTruthy();
});

it("shows workspace-synced notification settings and Telegram alert configuration", () => {
  renderSettings();
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Email" }).readOnly).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Change email" }).disabled).toBe(true);
  expect(screen.getByRole("rowheader", { name: /scheduled report/i })).toBeTruthy();
  expect(screen.getByRole("rowheader", { name: /WhatsApp Business/i })).toBeTruthy();
  expect(screen.getByText(/preferences are saved to your workspace/i)).toBeTruthy();
  expect(screen.getByLabelText("Telegram Chat ID")).toBeTruthy();
});

it("keeps bulk settings local to the selected group and restores choices and timing after saving", () => {
  const { unmount } = renderSettings();
  fireEvent.click(screen.getByRole("switch", { name: "Receive notifications" }));
  const advanced = within(screen.getByRole("table", { name: "Advanced settings" }));
  const integrations = within(screen.getByRole("table", { name: "Integrations" }));
  const activity = advanced.getByRole<HTMLInputElement>("checkbox", { name: "Activity limits: Mobile" });
  const browser = advanced.getByRole<HTMLInputElement>("checkbox", { name: "Activity limits: Browser" });
  const whatsapp = integrations.getByRole<HTMLInputElement>("checkbox", { name: "WhatsApp Business: Mobile" });
  fireEvent.click(activity);
  const allMobile = advanced.getByRole<HTMLInputElement>("checkbox", { name: "Select all: Mobile" });
  expect(allMobile.indeterminate).toBe(true);
  fireEvent.click(allMobile);
  expect(advanced.getByRole<HTMLInputElement>("checkbox", { name: "Calls: Mobile" }).checked).toBe(true);
  expect(browser.checked).toBe(false);
  expect(whatsapp.checked).toBe(false);
  fireEvent.change(advanced.getByLabelText("Inbox: Email frequency"), { target: { value: "daily" } });
  fireEvent.change(advanced.getByLabelText("Reminder interval"), { target: { value: "15" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  unmount();
  renderSettings();
  expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Activity limits: Mobile" }).checked).toBe(true);
  expect(screen.getByLabelText<HTMLSelectElement>("Inbox: Email frequency").value).toBe("daily");
  expect(screen.getByLabelText<HTMLSelectElement>("Reminder interval").value).toBe("15");
});

it("keeps legacy name, note, and channel choices", () => {
  localStorage.setItem(key, JSON.stringify({ name: "Sam", note: "Local note", notifications: true, choices: { "inbox:email": true, "tasks:browser": true, "bookings:email": true } }));
  renderSettings();
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Name" }).value).toBe("Sam");
  expect(screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Note" }).value).toBe("Local note");
  expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Inbox: Email" }).checked).toBe(true);
  expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /before the event: Browser/ }).checked).toBe(true);
  expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /assigned a new event: Email/ }).checked).toBe(true);
});

it("recovers from malformed data and reports a blocked write", () => {
  localStorage.setItem(key, JSON.stringify({ name: 42, note: null, choices: null }));
  renderSettings();
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Name" }).value).toBe("");
  const save = screen.getByRole<HTMLButtonElement>("button", { name: "Save" });
  expect(save.disabled).toBe(true);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Sam" } });
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("blocked"); });
  fireEvent.click(save);
  expect(screen.getByRole("alert").textContent).toContain("Profile could not be saved.");
});

it("keeps the language selector in panel settings", () => {
  renderSettings("az");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Dil" }).value).toBe("az");
  expect(screen.getByRole("heading", { name: "Bildiriş ayarları" })).toBeTruthy();
});
