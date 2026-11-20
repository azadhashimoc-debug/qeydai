// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProductPreview, type PreviewCopy } from "./ProductPreview";

const sample = {} as PreviewCopy;

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("shows the four QeydAI showcase stages in Azerbaijani", () => {
  render(<ProductPreview copy={sample} brand="QeydAI" lobbyAlt="" lang="az" />);
  const tabs = screen.getAllByRole("tab");
  expect(tabs).toHaveLength(4);
  expect(tabs.map((tab) => tab.textContent)).toEqual(["Cəlb et", "Avtomatlaşdır", "Böyüt", "Təhlil et"]);
  expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe("pm-live-tab-capture");
  expect(screen.getAllByText("Aysel Məmmədova").length).toBeGreaterThan(0);
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

it("reveals the catalog as the sample sales conversation progresses", () => {
  vi.useFakeTimers();
  render(<ProductPreview copy={sample} brand="QeydAI" lobbyAlt="" lang="az" />);
  fireEvent.click(screen.getByRole("tab", { name: "Böyüt" }));
  act(() => vi.advanceTimersByTime(1850));
  expect(screen.getByText("Gündəlik baxım dəsti")).toBeTruthy();
  expect(screen.getAllByText("149 AZN").length).toBeGreaterThan(0);
});

it("shows an illustrated guide and magnifier after the booking scene progresses", () => {
  vi.useFakeTimers();
  const { container } = render(<ProductPreview copy={sample} brand="QeydAI" lobbyAlt="" lang="az" />);
  fireEvent.click(screen.getByRole("tab", { name: "Avtomatlaşdır" }));
  act(() => vi.advanceTimersByTime(1850));
  act(() => vi.advanceTimersByTime(1850));
  expect(container.querySelector(".pm-live-guide-lens")).not.toBeNull();
  expect(container.querySelector(".pm-live-calendar-event")).not.toBeNull();
});

it("updates keyboard selection and keeps all demo elements non-interactive", () => {
  render(<ProductPreview copy={sample} brand="QeydAI" lobbyAlt="" lang="az" />);
  const initial = screen.getByRole("tab", { name: "Cəlb et" });
  fireEvent.keyDown(initial, { key: "ArrowRight" });
  expect(screen.getByRole("tab", { name: "Avtomatlaşdır" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("İnteraktiv nümayiş · real müştəri məlumatı deyil")).toBeTruthy();
});
