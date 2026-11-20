// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProductPreview, type PreviewCopy } from "./ProductPreview";

const sample = {} as PreviewCopy;

afterEach(() => cleanup());

it("shows the four QeydAI showcase stages in Azerbaijani", () => {
  render(<ProductPreview copy={sample} brand="QeydAI" lobbyAlt="" lang="az" />);
  const tabs = screen.getAllByRole("tab");
  expect(tabs).toHaveLength(4);
  expect(tabs.map((tab) => tab.textContent)).toEqual(["Cəlb et", "Avtomatlaşdır", "Böyüt", "Təhlil et"]);
  expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe("pm-live-tab-capture");
  expect(screen.getByText("Aysel Məmmədova")).toBeTruthy();
});

it("switches to booking and analytics without navigating away", () => {
  render(<ProductPreview copy={sample} brand="QeydAI" lobbyAlt="" lang="az" />);
  fireEvent.click(screen.getByRole("tab", { name: "Avtomatlaşdır" }));
  expect(screen.getByText("Rezervasiyalar")).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Avtomatlaşdır" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "Təhlil et" }));
  expect(screen.getByText("Kanallar üzrə müraciətlər")).toBeTruthy();
});

it("shows the same stages in English when selected", () => {
  render(<ProductPreview copy={sample} brand="QeydAI" lobbyAlt="" lang="en" />);
  expect(screen.getByRole("tab", { name: "Automate" })).toBeTruthy();
  expect(screen.getByText("Interactive preview · no real customer data")).toBeTruthy();
});
