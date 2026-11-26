import { PLAN_IDS, PLAN_MONTHLY_AZN, PLAN_SETUP_FEE_AZN, TRIAL_DAYS, planTermTotalAzn } from "@/lib/marketing/pricing";

// llms.txt: a short, machine-readable map of the site for AI assistants.
// See https://llmstxt.org. Prices come from src/lib/marketing/pricing.ts.

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://panelim.az";

const NAMES = { starter: "Başlanğıc", growth: "İnkişaf", pro: "Pro" } as const;

const priceLines = PLAN_IDS.map((plan) => {
  const p = PLAN_MONTHLY_AZN[plan];
  const setup = PLAN_SETUP_FEE_AZN[plan] ? `; quraşdırma haqqı ${PLAN_SETUP_FEE_AZN[plan]} AZN birdəfəlik` : "";
  return `- ${NAMES[plan]}: ${p.monthly} AZN/ay aylıq ödənişdə (monthly). 6 aylıq ödənişdə ayda ${p.halfYear} AZN (${planTermTotalAzn(plan, "halfYear")} AZN hər 6 ayda), illik ödənişdə ayda ${p.annual} AZN (${planTermTotalAzn(plan, "annual")} AZN ildə)${setup}`;
}).join("\n");

const body = `# panelim.az

> panelim.az (Qeydai) — WhatsApp, Instagram və Telegram müraciətlərini satış, görüş və xidmət prosesləri ilə birləşdirən Azərbaycan dilli CRM. Azerbaijani-language AI sales and CRM platform for small and mid-size businesses.

## Məhsul (Product)
- [Məhsul haqqında](${base}/az/product)
- [Pipeline (satış mərhələləri)](${base}/az/pipeline)
- [Inbox (vahid gələn qutusu)](${base}/az/inbox)
- [AI funksiyaları](${base}/az/ai)
- [Görüş planlaşdırma (booking)](${base}/az/booking)
- [Kanallar](${base}/az/channels)
- [İnteqrasiyalar](${base}/az/integrations)

## Qiymət (AZN)
Əsas qiymət aylıq ödənişdir. 6 aylıq və illik rəqəmlər əvvəlcədən ödənişdə ayda düşən məbləğdir.
Headline prices are month-to-month. The 6-month and yearly figures are per-month equivalents of a prepaid term, not the monthly price.
- [Qiymətlər](${base}/az/pricing)
${priceLines}
- Korporativ: fərdi qiymət
- Bütün planlarda ${TRIAL_DAYS} günlük pulsuz sınaq (free trial).

## Sahələr və hallar (Industries and cases)
- [Sahələr](${base}/az/industries)
- [Müştəri hekayələri](${base}/az/cases)
- [Bloq](${base}/az/blog)

## Əlaqə
- [Demo sorğusu](${base}/az/demo)
- [Əlaqə](${base}/az/contact)
- [Qeydiyyat](${base}/az/register)

## English
- [Home (English)](${base}/en)
- [Pricing (English)](${base}/en/pricing)

## Legal
- [Şərtlər](${base}/az/legal/terms)
- [Məxfilik](${base}/az/legal/privacy)
- [Sitemap](${base}/sitemap.xml)
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
