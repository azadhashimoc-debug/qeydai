export type WaCategoryCounts = {
  marketing: number;
  utility: number;
  auth: number;
  service: number;
};

export type WaCostEstimate = {
  marketingUsd: number;
  utilityUsd: number;
  authUsd: number;
  serviceUsd: number;
  totalUsd: number;
  totalAzn: number;
};

const WA_RATES_USD = {
  marketing: 0.045,
  utility: 0.015,
  auth: 0.012,
  service: 0,
} as const;

const DEFAULT_AZN_RATE = 1.7;

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function clampCount(value: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

export function normalizePhoneDigits(countryCode: string, localNumber: string): string {
  const ccDigits = countryCode.replace(/\D/g, "");
  const localDigitsRaw = localNumber.replace(/\D/g, "");
  const localDigits = ccDigits.length > 0 ? localDigitsRaw.replace(/^0+/, "") : localDigitsRaw;
  return `${ccDigits}${localDigits}`;
}

export function buildWhatsAppUrl(
  countryCode: string,
  localNumber: string,
  message: string,
): string | null {
  const digits = normalizePhoneDigits(countryCode, localNumber);
  if (digits.length < 8 || digits.length > 15) {
    return null;
  }
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(trimmedMessage)}`;
}

export function sanitizeQrUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function estimateWhatsAppCost(
  counts: WaCategoryCounts,
  aznRate: number = DEFAULT_AZN_RATE,
): WaCostEstimate {
  const safeRate =
    typeof aznRate === "number" && Number.isFinite(aznRate) && aznRate > 0
      ? aznRate
      : DEFAULT_AZN_RATE;

  const marketingUsd = round4(clampCount(counts.marketing) * WA_RATES_USD.marketing);
  const utilityUsd = round4(clampCount(counts.utility) * WA_RATES_USD.utility);
  const authUsd = round4(clampCount(counts.auth) * WA_RATES_USD.auth);
  const serviceUsd = round4(clampCount(counts.service) * WA_RATES_USD.service);
  const totalUsd = round4(marketingUsd + utilityUsd + authUsd + serviceUsd);
  const totalAzn = round4(totalUsd * safeRate);

  return {
    marketingUsd,
    utilityUsd,
    authUsd,
    serviceUsd,
    totalUsd,
    totalAzn,
  };
}
