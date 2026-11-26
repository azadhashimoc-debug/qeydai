/**
 * Public company and contact details.
 *
 * Every value comes from a NEXT_PUBLIC_* env var so the owner can fill them in
 * Vercel without a code change. Anything unset is hidden from the site rather
 * than replaced with a made-up number or address.
 */
function clean(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

function digits(v: string | null): string | null {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d : null;
}

function safeUrl(v: string | undefined): string | null {
  const t = clean(v);
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function safeEmail(v: string | undefined): string | null {
  const t = clean(v);
  return t && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(t) ? t : null;
}

export type CompanyInfo = {
  legalName: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  privacyEmail: string | null;
  whatsappDigits: string | null;
  social: { id: "telegram" | "instagram" | "messenger" | "whatsapp"; label: string; href: string }[];
};

export function getCompanyInfo(env: Record<string, string | undefined> = process.env): CompanyInfo {
  const whatsappDigits = digits(clean(env.NEXT_PUBLIC_CONTACT_WHATSAPP));
  const social: CompanyInfo["social"] = [];
  const telegram = safeUrl(env.NEXT_PUBLIC_SOCIAL_TELEGRAM);
  const instagram = safeUrl(env.NEXT_PUBLIC_SOCIAL_INSTAGRAM);
  const messenger = safeUrl(env.NEXT_PUBLIC_SOCIAL_MESSENGER);
  if (telegram) social.push({ id: "telegram", label: "Telegram", href: telegram });
  if (instagram) social.push({ id: "instagram", label: "Instagram", href: instagram });
  if (messenger) social.push({ id: "messenger", label: "Messenger", href: messenger });
  if (whatsappDigits) social.push({ id: "whatsapp", label: "WhatsApp", href: `https://wa.me/${whatsappDigits}` });
  const email = safeEmail(env.NEXT_PUBLIC_CONTACT_EMAIL);
  return {
    legalName: clean(env.NEXT_PUBLIC_COMPANY_LEGAL_NAME),
    taxId: clean(env.NEXT_PUBLIC_COMPANY_TAX_ID),
    address: clean(env.NEXT_PUBLIC_COMPANY_ADDRESS),
    phone: clean(env.NEXT_PUBLIC_CONTACT_PHONE),
    email,
    privacyEmail: safeEmail(env.NEXT_PUBLIC_PRIVACY_EMAIL) ?? email,
    whatsappDigits,
    social,
  };
}

/**
 * Read at build time on the client: Next inlines NEXT_PUBLIC_* only when each
 * one is referenced by its full name, so list them explicitly here.
 */
export const PUBLIC_COMPANY_INFO: CompanyInfo = getCompanyInfo({
  NEXT_PUBLIC_COMPANY_LEGAL_NAME: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME,
  NEXT_PUBLIC_COMPANY_TAX_ID: process.env.NEXT_PUBLIC_COMPANY_TAX_ID,
  NEXT_PUBLIC_COMPANY_ADDRESS: process.env.NEXT_PUBLIC_COMPANY_ADDRESS,
  NEXT_PUBLIC_CONTACT_PHONE: process.env.NEXT_PUBLIC_CONTACT_PHONE,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  NEXT_PUBLIC_PRIVACY_EMAIL: process.env.NEXT_PUBLIC_PRIVACY_EMAIL,
  NEXT_PUBLIC_CONTACT_WHATSAPP: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP,
  NEXT_PUBLIC_SOCIAL_TELEGRAM: process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM,
  NEXT_PUBLIC_SOCIAL_INSTAGRAM: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
  NEXT_PUBLIC_SOCIAL_MESSENGER: process.env.NEXT_PUBLIC_SOCIAL_MESSENGER,
});
