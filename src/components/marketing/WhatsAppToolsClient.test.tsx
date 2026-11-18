// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import subpagesEn from "@/app/[lang]/dictionaries/subpages-en.json";
import { WhatsAppToolsClient } from "./WhatsAppToolsClient";

afterEach(() => {
  cleanup();
});

describe("WhatsAppToolsClient", () => {
  it("builds live wa.me links and copies to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<WhatsAppToolsClient copy={subpagesEn.tools} />);

    const phoneInput = screen.getByLabelText(subpagesEn.tools.linkBuilder.phoneNumber);
    const msgInput = screen.getByLabelText(subpagesEn.tools.linkBuilder.message);

    fireEvent.change(phoneInput, { target: { value: "050 123 45 67" } });
    fireEvent.change(msgInput, { target: { value: "Hello QeydAI" } });

    const expected = "https://wa.me/994501234567?text=Hello%20QeydAI";
    expect(screen.getByText(expected)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: subpagesEn.tools.linkBuilder.copyButton }));
    expect(writeText).toHaveBeenCalledWith(expected);
    expect(await screen.findByText(subpagesEn.tools.linkBuilder.copied)).toBeTruthy();
  });

  it("blocks invalid javascript: URLs and renders inline SVG QR for valid https:// URLs", () => {
    const { container } = render(<WhatsAppToolsClient copy={subpagesEn.tools} />);

    fireEvent.click(screen.getByRole("tab", { name: subpagesEn.tools.tabs.qr }));

    const urlInput = screen.getByLabelText(subpagesEn.tools.qrGenerator.urlInputLabel);
    fireEvent.change(urlInput, { target: { value: "javascript:alert(1)" } });

    expect(screen.getByText(subpagesEn.tools.qrGenerator.invalidUrl)).toBeTruthy();
    expect(container.querySelector(".pm-qr-preview svg")).toBeNull();

    fireEvent.change(urlInput, { target: { value: "https://panelim.az" } });
    expect(screen.queryByText(subpagesEn.tools.qrGenerator.invalidUrl)).toBeNull();
    expect(container.querySelector(".pm-qr-preview svg")).not.toBeNull();
  });

  it("calculates Meta fee estimates in USD and AZN", () => {
    render(<WhatsAppToolsClient copy={subpagesEn.tools} />);

    fireEvent.click(screen.getByRole("tab", { name: subpagesEn.tools.tabs.calculator }));

    const marketingInput = screen.getByLabelText(subpagesEn.tools.feeCalculator.marketingLabel);
    const utilityInput = screen.getByLabelText(subpagesEn.tools.feeCalculator.utilityLabel);
    const authInput = screen.getByLabelText(subpagesEn.tools.feeCalculator.authLabel);
    const serviceInput = screen.getByLabelText(subpagesEn.tools.feeCalculator.serviceLabel);

    fireEvent.change(marketingInput, { target: { value: "1000" } });
    fireEvent.change(utilityInput, { target: { value: "0" } });
    fireEvent.change(authInput, { target: { value: "0" } });
    fireEvent.change(serviceInput, { target: { value: "5000" } });

    // 1000 * 0.045 = 45.00 USD
    expect(screen.getByText("$45.00")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: subpagesEn.tools.feeCalculator.aznToggle }));
    // 45 * 1.70 = 76.50 AZN
    expect(screen.getByText("76.50 AZN")).toBeTruthy();
  });
});
