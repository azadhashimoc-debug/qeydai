// llms.txt: a short, machine-readable map of the site for AI assistants.
// See https://llmstxt.org. Kept in sync with the public pricing in the landing dictionary.

import { getSiteUrl } from "@/lib/http/site-url";

const base = getSiteUrl();

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

## Qiymət (AZN per month)
- [Qiymətlər](${base}/az/pricing)
- Başlanğıc: 49 AZN/ay (6 aylıq ödənişdə 44 AZN, illik ödənişdə 39 AZN)
- İnkişaf: 89 AZN/ay (6 aylıq 80 AZN, illik 71 AZN); quraşdırma haqqı 100 AZN birdəfəlik
- Pro: 149 AZN/ay (6 aylıq 134 AZN, illik 119 AZN); quraşdırma haqqı 100 AZN birdəfəlik
- Korporativ: fərdi qiymət

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
- [Məlumatların silinməsi](${base}/az/legal/data-deletion)
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
