"use client";

import QRCode from "qrcode";
import { useMemo, useState } from "react";
import type { SubpagesDict } from "@/app/[lang]/dictionaries";
import {
  buildWhatsAppUrl,
  estimateWhatsAppCost,
  sanitizeQrUrl,
} from "@/lib/marketing/wa-tools";

type ToolTab = "link" | "qr" | "calculator";

const COUNTRY_CODES = [
  { code: "994", label: "AZ (+994)" },
  { code: "90", label: "TR (+90)" },
  { code: "7", label: "RU / KZ (+7)" },
  { code: "1", label: "US / CA (+1)" },
  { code: "44", label: "UK (+44)" },
  { code: "", label: "Custom" },
];

function buildQrSvgPath(url: string): { size: number; d: string } | null {
  try {
    const matrix = QRCode.create(url, { errorCorrectionLevel: "M" }).modules;
    const size = matrix.size;
    const parts: string[] = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (matrix.get(r, c)) {
          parts.push(`M${c},${r}h1v1h-1z`);
        }
      }
    }
    return { size, d: parts.join("") };
  } catch {
    return null;
  }
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function WhatsAppToolsClient({ copy }: { copy: SubpagesDict["tools"] }) {
  const [tab, setTab] = useState<ToolTab>("link");

  // Link Builder state
  const [countryCode, setCountryCode] = useState("994");
  const [phone, setPhone] = useState("50 123 45 67");
  const [message, setMessage] = useState(copy.linkBuilder.messagePlaceholder);
  const [copied, setCopied] = useState(false);

  const generatedUrl = useMemo(
    () => buildWhatsAppUrl(countryCode, phone, message),
    [countryCode, phone, message],
  );

  // QR Generator state
  const [qrOverride, setQrOverride] = useState<string | null>(null);
  const qrInput = qrOverride ?? generatedUrl ?? "https://panelim.az";
  const safeQrUrl = useMemo(() => sanitizeQrUrl(qrInput), [qrInput]);
  const qrPath = useMemo(
    () => (safeQrUrl ? buildQrSvgPath(safeQrUrl) : null),
    [safeQrUrl],
  );

  // Calculator state
  const [marketing, setMarketing] = useState(250);
  const [utility, setUtility] = useState(400);
  const [auth, setAuth] = useState(100);
  const [service, setService] = useState(1000);
  const [currency, setCurrency] = useState<"USD" | "AZN">("USD");

  const estimate = useMemo(
    () => estimateWhatsAppCost({ marketing, utility, auth, service }),
    [marketing, utility, auth, service],
  );

  async function handleCopy() {
    if (!generatedUrl || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadSvg() {
    if (!safeQrUrl) return;
    const svg = await QRCode.toString(safeQrUrl, { type: "svg", margin: 2 });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, "whatsapp-qr.svg");
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPng() {
    if (!safeQrUrl) return;
    const dataUrl = await QRCode.toDataURL(safeQrUrl, { width: 512, margin: 2 });
    triggerDownload(dataUrl, "whatsapp-qr.png");
  }

  const formattedTotal =
    currency === "USD"
      ? `$${estimate.totalUsd.toFixed(2)}`
      : `${estimate.totalAzn.toFixed(2)} AZN`;

  return (
    <div className="pm-tools-card">
      <div className="pm-tools-tabs" role="tablist" aria-label={copy.hero.badge}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "link"}
          className={tab === "link" ? "pm-tools-tab is-active" : "pm-tools-tab"}
          onClick={() => setTab("link")}
        >
          {copy.tabs.link}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "qr"}
          className={tab === "qr" ? "pm-tools-tab is-active" : "pm-tools-tab"}
          onClick={() => setTab("qr")}
        >
          {copy.tabs.qr}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "calculator"}
          className={tab === "calculator" ? "pm-tools-tab is-active" : "pm-tools-tab"}
          onClick={() => setTab("calculator")}
        >
          {copy.tabs.calculator}
        </button>
      </div>

      {tab === "link" && (
        <div role="tabpanel" className="pm-tools-split">
          <div className="pm-tools-form">
            <div>
              <h2>{copy.linkBuilder.title}</h2>
              <p className="pm-auth-note">{copy.linkBuilder.desc}</p>
            </div>

            <div className="pm-tools-row">
              <div className="pm-field">
                <label htmlFor="wa-country">{copy.linkBuilder.countryLabel}</label>
                <select
                  id="wa-country"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.label} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pm-field">
                <label htmlFor="wa-phone">{copy.linkBuilder.phoneLabel}</label>
                <input
                  id="wa-phone"
                  type="tel"
                  value={phone}
                  placeholder={copy.linkBuilder.phonePlaceholder}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="pm-field">
              <label htmlFor="wa-message">{copy.linkBuilder.messageLabel}</label>
              <textarea
                id="wa-message"
                value={message}
                placeholder={copy.linkBuilder.messagePlaceholder}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="pm-tools-output">
            <div>
              <strong>{copy.linkBuilder.outputLabel}</strong>
            </div>
            <div className="pm-code-box" data-testid="wa-link-output">
              {generatedUrl ?? "—"}
            </div>
            <button
              type="button"
              className="pm-btn pm-btn-primary"
              disabled={!generatedUrl}
              onClick={handleCopy}
            >
              {copied ? copy.linkBuilder.copied : copy.linkBuilder.copyButton}
            </button>

            <div>
              <p className="pm-auth-note">{copy.linkBuilder.previewTitle}</p>
              <div className="pm-mini-card" style={{ marginTop: 8 }}>
                <p className="pm-bubble-out">{message || copy.linkBuilder.messagePlaceholder}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "qr" && (
        <div role="tabpanel" className="pm-tools-split">
          <div className="pm-tools-form">
            <div>
              <h2>{copy.qrGenerator.title}</h2>
              <p className="pm-auth-note">{copy.qrGenerator.desc}</p>
            </div>

            <div className="pm-field">
              <label htmlFor="qr-url">{copy.qrGenerator.urlLabel}</label>
              <input
                id="qr-url"
                type="url"
                value={qrInput}
                onChange={(e) => setQrOverride(e.target.value)}
              />
              {!safeQrUrl && (
                <p role="alert" className="pm-error-note">
                  {copy.qrGenerator.invalidUrl}
                </p>
              )}
            </div>

            <div className="pm-hero-actions">
              <button
                type="button"
                className="pm-btn pm-btn-primary"
                disabled={!safeQrUrl}
                onClick={handleDownloadSvg}
              >
                {copy.qrGenerator.downloadSvg}
              </button>
              <button
                type="button"
                className="pm-btn pm-btn-outline"
                disabled={!safeQrUrl}
                onClick={handleDownloadPng}
              >
                {copy.qrGenerator.downloadPng}
              </button>
            </div>
          </div>

          <div className="pm-tools-output">
            <div className="pm-qr-preview">
              {qrPath && (
                <svg
                  viewBox={`-2 -2 ${qrPath.size + 4} ${qrPath.size + 4}`}
                  role="img"
                  aria-label={copy.qrGenerator.previewAlt}
                >
                  <rect x="-2" y="-2" width={qrPath.size + 4} height={qrPath.size + 4} fill="#ffffff" />
                  <path d={qrPath.d} fill="#0e0142" />
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "calculator" && (
        <div role="tabpanel" className="pm-tools-split">
          <div className="pm-tools-form">
            <div>
              <h2>{copy.calculator.title}</h2>
              <p className="pm-auth-note">{copy.calculator.desc}</p>
            </div>

            <div className="pm-field">
              <label htmlFor="calc-marketing">{copy.calculator.marketingLabel}</label>
              <input
                id="calc-marketing"
                type="number"
                min={0}
                value={marketing}
                onChange={(e) => setMarketing(Number(e.target.value) || 0)}
              />
            </div>

            <div className="pm-field">
              <label htmlFor="calc-utility">{copy.calculator.utilityLabel}</label>
              <input
                id="calc-utility"
                type="number"
                min={0}
                value={utility}
                onChange={(e) => setUtility(Number(e.target.value) || 0)}
              />
            </div>

            <div className="pm-field">
              <label htmlFor="calc-auth">{copy.calculator.authLabel}</label>
              <input
                id="calc-auth"
                type="number"
                min={0}
                value={auth}
                onChange={(e) => setAuth(Number(e.target.value) || 0)}
              />
            </div>

            <div className="pm-field">
              <label htmlFor="calc-service">{copy.calculator.serviceLabel}</label>
              <input
                id="calc-service"
                type="number"
                min={0}
                value={service}
                onChange={(e) => setService(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="pm-tools-output">
            <div className="pm-hero-actions">
              <span className="pm-auth-note">{copy.calculator.rateNote}</span>
              <button
                type="button"
                className={currency === "USD" ? "pm-tools-tab is-active" : "pm-tools-tab"}
                onClick={() => setCurrency("USD")}
              >
                {copy.calculator.currencyToggleUsd}
              </button>
              <button
                type="button"
                className={currency === "AZN" ? "pm-tools-tab is-active" : "pm-tools-tab"}
                onClick={() => setCurrency("AZN")}
              >
                {copy.calculator.currencyToggleAzn}
              </button>
            </div>

            <div className="pm-calc-total">
              <span>{copy.calculator.totalMonthly}</span>
              <strong>{formattedTotal}</strong>
            </div>

            <p className="pm-auth-note">{copy.calculator.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
