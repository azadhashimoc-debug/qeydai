export type PublicSocialChannel = {
  id: "telegram" | "instagram" | "messenger" | "whatsapp";
  label: string;
  href: string;
};

export type PublicContactConfig = {
  socialChannels: PublicSocialChannel[];
  whatsappUrl: string | null;
  phone: string | null;
  email: string | null;
  officeAddress: string | null;
};

export type LegalEntityConfig = {
  companyName: string | null;
  taxId: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
};

function safeHttpsUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function buildWhatsAppUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  // Reject placeholder/example numbers and implausibly short numbers.
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits === "994501234567" || digits === "994500000000") return null;
  return `https://wa.me/${digits}`;
}

function cleanText(raw: string | undefined, maxLen = 200): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

/**
 * Reads public-facing contact and social channel URLs strictly from NEXT_PUBLIC_*
 * env vars so unverified social links or placeholder numbers are never published.
 */
export function getPublicContactConfig(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_TELEGRAM_URL: process.env.NEXT_PUBLIC_TELEGRAM_URL,
    NEXT_PUBLIC_INSTAGRAM_URL: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    NEXT_PUBLIC_MESSENGER_URL: process.env.NEXT_PUBLIC_MESSENGER_URL,
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    NEXT_PUBLIC_CONTACT_PHONE: process.env.NEXT_PUBLIC_CONTACT_PHONE,
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    NEXT_PUBLIC_OFFICE_ADDRESS: process.env.NEXT_PUBLIC_OFFICE_ADDRESS,
  },
): PublicContactConfig {
  const telegram = safeHttpsUrl(env.NEXT_PUBLIC_TELEGRAM_URL);
  const instagram = safeHttpsUrl(env.NEXT_PUBLIC_INSTAGRAM_URL);
  const messenger = safeHttpsUrl(env.NEXT_PUBLIC_MESSENGER_URL);
  const whatsappUrl = buildWhatsAppUrl(env.NEXT_PUBLIC_WHATSAPP_NUMBER);

  const socialChannels: PublicSocialChannel[] = [];
  if (telegram) socialChannels.push({ id: "telegram", label: "Telegram", href: telegram });
  if (instagram) socialChannels.push({ id: "instagram", label: "Instagram", href: instagram });
  if (messenger) socialChannels.push({ id: "messenger", label: "Messenger", href: messenger });
  if (whatsappUrl) socialChannels.push({ id: "whatsapp", label: "WhatsApp", href: whatsappUrl });

  return {
    socialChannels,
    whatsappUrl,
    phone: cleanText(env.NEXT_PUBLIC_CONTACT_PHONE, 40),
    email: cleanText(env.NEXT_PUBLIC_CONTACT_EMAIL, 120),
    officeAddress: cleanText(env.NEXT_PUBLIC_OFFICE_ADDRESS, 200),
  };
}

export function getLegalEntityConfig(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_LEGAL_ENTITY_NAME: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME,
    NEXT_PUBLIC_LEGAL_VOEN: process.env.NEXT_PUBLIC_LEGAL_VOEN,
    NEXT_PUBLIC_LEGAL_ADDRESS: process.env.NEXT_PUBLIC_LEGAL_ADDRESS,
    NEXT_PUBLIC_LEGAL_EMAIL: process.env.NEXT_PUBLIC_LEGAL_EMAIL,
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    NEXT_PUBLIC_CONTACT_PHONE: process.env.NEXT_PUBLIC_CONTACT_PHONE,
  },
): LegalEntityConfig {
  return {
    companyName: cleanText(env.NEXT_PUBLIC_LEGAL_ENTITY_NAME, 160),
    taxId: cleanText(env.NEXT_PUBLIC_LEGAL_VOEN, 40),
    address: cleanText(env.NEXT_PUBLIC_LEGAL_ADDRESS, 200),
    email: cleanText(env.NEXT_PUBLIC_LEGAL_EMAIL, 120) ?? cleanText(env.NEXT_PUBLIC_CONTACT_EMAIL, 120),
    phone: cleanText(env.NEXT_PUBLIC_CONTACT_PHONE, 40),
  };
}

export function getProductVideoUrl(
  raw: string | undefined = process.env.NEXT_PUBLIC_PRODUCT_VIDEO_URL,
): string | null {
  return safeHttpsUrl(raw);
}
