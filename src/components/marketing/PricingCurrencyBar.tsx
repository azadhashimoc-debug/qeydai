"use client";

import { useState } from "react";

export type CurrencyCode = "AZN" | "USD" | "TRY" | "EUR" | "GBP";

const CURRENCIES: {
  code: CurrencyCode;
  symbol: string;
  region: "EMEA" | "NAC";
  rateFromAzn: number;
  label: string;
}[] = [
  { code: "AZN", symbol: "AZN", region: "EMEA", rateFromAzn: 1, label: "AZN · Azərbaycan Manatı" },
  { code: "USD", symbol: "$", region: "NAC", rateFromAzn: 0.59, label: "$ USD · US Dollar" },
  { code: "TRY", symbol: "₺", region: "EMEA", rateFromAzn: 20.2, label: "₺ TRY · Türk Lirası" },
  { code: "EUR", symbol: "€", region: "EMEA", rateFromAzn: 0.55, label: "€ EUR · Euro" },
  { code: "GBP", symbol: "£", region: "EMEA", rateFromAzn: 0.47, label: "£ GBP · British Pound" },
];

export function convertPriceString(rawPrice: string, currency: CurrencyCode): string {
  if (currency === "AZN") return rawPrice;
  const match = rawPrice.match(/(\d+)/);
  if (!match) return rawPrice;
  const baseAzn = Number(match[1]);
  const target = CURRENCIES.find((c) => c.code === currency);
  if (!target || !Number.isFinite(baseAzn)) return rawPrice;
  const converted = Math.round(baseAzn * target.rateFromAzn);
  return target.code === "USD" || target.code === "EUR" || target.code === "GBP" || target.code === "TRY"
    ? `${target.symbol}${converted}`
    : `${converted} ${target.symbol}`;
}

export function PricingCurrencyBar({
  currency,
  onCurrencyChange,
}: {
  currency: CurrencyCode;
  onCurrencyChange: (next: CurrencyCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const current = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  function openEnterpriseModal() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kommo:open-modal", { detail: { modal: "enterprise" } }),
      );
    }
  }

  return (
    <div className="pm-kommo-currency-bar">
      <div className="pm-kommo-currency-picker">
        <button
          type="button"
          className="pm-kommo-currency-btn js-currencies-button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span>🌐 {current.label}</span>
          <span>▾</span>
        </button>

        {open && (
          <div className="pm-kommo-currency-popup js-currencies-popup" role="menu">
            <p className="pm-kommo-currency-group">EMEA & NAC</p>
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                role="menuitem"
                className={
                  c.code === currency
                    ? "pm-kommo-currency-item is-active"
                    : "pm-kommo-currency-item"
                }
                onClick={() => {
                  onCurrencyChange(c.code);
                  setOpen(false);
                }}
              >
                <span>{c.label}</span>
                {c.code === currency && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pm-kommo-tooltip-wrap">
        <button
          type="button"
          className="pm-kommo-tooltip-trigger"
          aria-expanded={tooltipOpen}
          onClick={() => setTooltipOpen((v) => !v)}
        >
          ⓘ Total cost / Ümumi xərc
        </button>
        {tooltipOpen && (
          <div className="pm-kommo-tooltip-box" role="note">
            <span>
              Qiymətlər seçilmiş dövr üzrə aylıq hesablanır. Bütün planlara 14 günlük pulsuz sınaq daxildir.
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="pm-kommo-enterprise-trigger js-enterprise-request-trigger"
        onClick={openEnterpriseModal}
      >
        🏢 Enterprise sorğusu / Request Enterprise call
      </button>
    </div>
  );
}
