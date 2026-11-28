import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/http/site-url";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { PricingMatrixClient } from "@/components/marketing/PricingMatrixClient";
import { PricingTiersClient, type PricingTier } from "@/components/marketing/PricingTiersClient";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, FeatureGrid, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/pricing">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/pricing",
    title: d.subpages.pricingPage.hero.title,
    description: d.subpages.pricingPage.hero.subtitle,
    brand: d.brand,
    image: "/images/p-pricing-pro.webp",
  });
}

export default async function PricingPage({ params }: PageProps<"/[lang]/pricing">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const pricing = s.pricingPage;
  const siteUrl = getSiteUrl();

  const tiers: PricingTier[] =
    locale === "en"
      ? [
          {
            id: "starter",
            name: "Starter",
            desc: "Customer and appointment management.",
            prices: { monthly: "99 AZN", halfYear: "99 AZN", annual: "99 AZN" },
            setupNote: "First month: 49 AZN",
            ctaLabel: "Choose plan",
            limits: ["Customer database","Bookings","Staff panel"],
          },
          {
            id: "growth",
            name: "Standard",
            desc: "WhatsApp and Pani AI for your team.",
            popular: true,
            popularBadge: "Recommended",
            prices: { monthly: "199 AZN", halfYear: "199 AZN", annual: "199 AZN" },
            setupNote: "First month: 99 AZN",
            ctaLabel: "Choose plan",
            limits: ["Everything in Starter","WhatsApp connection","Pani AI assistant","Live onboarding"],
          },
          {
            id: "pro",
            name: "Premium",
            desc: "Extended support and team management.",
            prices: { monthly: "349 AZN", halfYear: "349 AZN", annual: "349 AZN" },
            setupNote: "First month: 175 AZN",
            ctaLabel: "Choose plan",
            limits: ["Everything in Standard","Unlimited staff","Priority technical support","Monthly report"],
          },
        ]
      : [
          {
            id: "starter",
            name: "Başlanğıc",
            desc: "Müştəri və rezervasiyaların idarə edilməsi.",
            prices: { monthly: "99 AZN", halfYear: "99 AZN", annual: "99 AZN" },
            setupNote: "İlk ay: 49 AZN",
            ctaLabel: "Paketi seç",
            limits: ["Müştəri bazası","Rezervasiya","İşçi paneli"],
          },
          {
            id: "growth",
            name: "Standart",
            desc: "WhatsApp və Pani AI ilə komanda işi.",
            popular: true,
            popularBadge: "Tövsiyə olunan",
            prices: { monthly: "199 AZN", halfYear: "199 AZN", annual: "199 AZN" },
            setupNote: "İlk ay: 99 AZN",
            ctaLabel: "Paketi seç",
            limits: ["Başlanğıc paketinin bütün imkanları","WhatsApp bağlantısı","Pani AI köməkçi","Canlı quraşdırma"],
          },
          {
            id: "pro",
            name: "Premium",
            desc: "Genişləndirilmiş dəstək və komanda idarəetməsi.",
            prices: { monthly: "349 AZN", halfYear: "349 AZN", annual: "349 AZN" },
            setupNote: "İlk ay: 175 AZN",
            ctaLabel: "Paketi seç",
            limits: ["Standart paketinin bütün imkanları","Limitsiz işçi","Öncəlikli texniki dəstək","Aylıq hesabat"],
          },
        ];

  const proBenefits =
    locale === "en"
      ? [
          {
            title: "WhatsApp messaging",
            desc: "Manage customer WhatsApp inquiries with the Standard and Premium plans.",
            tone: "lavender" as const,
          },
          {
            title: "Zero Double-Booking",
            desc: "Available appointment slots and automatic booking reminders.",
            tone: "mint" as const,
          },
          {
            title: "Revenue-Focused Pipeline",
            desc: "Track every deal from first message to paid sale in AZN.",
            tone: "sky" as const,
          },
          {
            title: "Multi-Branch Ready",
            desc: "Operate separate branches with isolated schedules and operator roles.",
            tone: "amber" as const,
          },
        ]
      : [
          {
            title: "WhatsApp mesajlaşması",
            desc: "Standart və Premium paketlərdə müştəri WhatsApp müraciətlərini idarə edin.",
            tone: "lavender" as const,
          },
          {
            title: "Dəqiq görüş rezervasiyası",
            desc: "Dolu saatları və eyni nömrə ilə təkrar rezervasiyaları nəzarətdə saxlayın.",
            tone: "mint" as const,
          },
          {
            title: "Gəlir yönümlü böyümə",
            desc: "İlk mesajdan ödənişli satışa qədər bütün mərhələləri AZN ilə izləyin.",
            tone: "sky" as const,
          },
          {
            title: "Çoxfiliallı bizneslər",
            desc: "Bakı və regionlardakı filialları təcrid olunmuş cədvəl və operatorlarla işlədin.",
            tone: "amber" as const,
          },
        ];

  const faqItems =
    locale === "en"
      ? [
          {
            q: "What is the first-month price?",
            a: "Starter: 49 AZN; Standard: 99 AZN; Premium: 175 AZN. Regular monthly pricing applies afterward.",
          },
          {
            q: "Which plans include live onboarding?",
            a: "Standard and Premium include live onboarding and WhatsApp connection.",
          },
          {
            q: "Are there any extra fees for WhatsApp Cloud API?",
            a: "Your panelim.az subscription covers the CRM, automation, and webhook engine. Meta conversation charges are billed directly at Meta's official rates.",
          },
          {
            q: "Is our business data separate from other workspaces?",
            a: "Yes. Every workspace is strictly tenant-isolated at the database and API key level.",
          },
        ]
      : [
          {
            q: "İlk ayın qiyməti nə qədərdir?",
            a: "Başlanğıc 49 AZN, Standart 99 AZN, Premium 175 AZN. Sonrakı aylarda adi aylıq qiymət tətbiq olunur.",
          },
          {
            q: "Canlı quraşdırma hansı paketlərə daxildir?",
            a: "Standart və Premium paketlərinə canlı quraşdırma və WhatsApp bağlantısı daxildir.",
          },
          {
            q: "WhatsApp Cloud API üçün əlavə ödəniş varmı?",
            a: "panelim.az abunəliyi CRM, bot və avtomatlaşdırma mühərrikini əhatə edir. Rəsmi Meta mesaj tarifləri birbaşa Meta hesabınız üzərindən hesablanır.",
          },
          {
            q: "Biznesimizin müştəri məlumatları digər iş sahələrindən ayrıdır?",
            a: "Bəli. Hər bir iş sahəsi verilənlər bazası və API açarı səviyyəsində tam təcrid olunmuş şəkildə saxlanılır.",
          },
        ];

  const pricingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: d.brand,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: pricing.hero.subtitle,
        url: `${siteUrl}/${locale}/pricing`,
        inLanguage: locale,
        offers: [
          {
            "@type": "Offer",
            name: tiers[0].name,
            priceCurrency: "AZN",
            price: "49",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "49",
              priceCurrency: "AZN",
              unitText: "MONTH",
            },
            url: `${siteUrl}/${locale}/pricing`,
          },
          {
            "@type": "Offer",
            name: tiers[1].name,
            priceCurrency: "AZN",
            price: "89",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "89",
              priceCurrency: "AZN",
              unitText: "MONTH",
            },
            url: `${siteUrl}/${locale}/pricing`,
          },
          {
            "@type": "Offer",
            name: tiers[2].name,
            priceCurrency: "AZN",
            price: "149",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "149",
              priceCurrency: "AZN",
              unitText: "MONTH",
            },
            url: `${siteUrl}/${locale}/pricing`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="marketing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pricingJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <a href="#main" className="skip-link">
        {d.a11y.skipToMain}
      </a>

      <SiteHeader
        lang={locale}
        brand={d.brand}
        a11y={d.a11y}
        nav={d.landing.nav}
        subNav={s.navGroups}
        mode="subpage"
        routeSuffix="/pricing"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={pricing.hero.badge}
          title={pricing.hero.title}
          subtitle={pricing.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bottomCta.primary }}
          secondaryCta={{ href: "#matrix", label: pricing.matrix.title }}
          image="p-pricing-pro"
          imageAlt={pricing.hero.title}
        />

        <section className="pm-section" style={{ paddingTop: "12px" }}>
          <div className="pm-wrap">
            <PricingTiersClient
              lang={locale}
              periods={pricing.periods}
              perMonthLabel={locale === "en" ? "/ mo" : "/ ay"}
              tiers={tiers}
            />
          </div>
        </section>

        <FeatureGrid
          heading={locale === "en" ? "Why teams choose panelim.az" : "Komandalar niyə panelim.az seçir?"}
          subheading={
            locale === "en"
              ? "Built to turn customer conversations into confirmed bookings and sales."
              : "Mesajları real satış və görüş qeydiyyatına çevirmək üçün ideal platforma."
          }
          columns={2}
          items={proBenefits}
        />

        <section className="pm-section">
          <div className="pm-wrap">
            <PricingMatrixClient
              matrix={pricing.matrix}
              planNames={
                locale === "en"
                  ? ["Starter", "Growth", "Pro", "Enterprise"]
                  : ["Başlanğıc", "İnkişaf", "Pro", "Korporativ"]
              }
            />
          </div>
        </section>

        <section className="pm-section">
          <div className="pm-wrap pm-faq-inner">
            <div className="pm-section-head">
              <h2>{locale === "en" ? "Frequently Asked Questions" : "Tez-tez verilən suallar"}</h2>
            </div>
            <div className="pm-faq-list">
              {faqItems.map((item) => (
                <details key={item.q} className="pm-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <BottomCtaBand
          title={s.common.bottomCta.title}
          subtitle={s.common.bottomCta.subtitle}
          primaryHref={`/${locale}/demo`}
          primaryLabel={s.common.bottomCta.primary}
          secondaryHref={`/${locale}/register`}
          secondaryLabel={s.authPages.login.noAccount}
        />
      </main>

      <SiteFooter
        lang={locale}
        other={other}
        tagline={d.landing.footer.tagline}
        copyright={d.landing.footer.copyright}
        switchLabel={d.landing.footer.switchLabel}
        cols={s.footer}
        routeSuffix="/pricing"
      />
    </div>
  );
}
