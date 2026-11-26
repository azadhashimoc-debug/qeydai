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
            desc: "For small businesses starting unified messaging and CRM.",
            prices: { monthly: "49 AZN", halfYear: "44 AZN", annual: "39 AZN" },
            setupNote: "No setup fee · 14-day free trial",
            ctaLabel: "Start 14-day trial",
            limits: [
              "1 channel (Telegram inbox)",
              "Kanban pipeline up to 500 leads",
              "Duplicate booking checks",
            ],
          },
          {
            id: "growth",
            name: "Growth",
            desc: "WhatsApp Cloud API + automated appointment scheduling.",
            popular: true,
            popularBadge: "Most Popular",
            prices: { monthly: "89 AZN", halfYear: "80 AZN", annual: "71 AZN" },
            setupNote: "Setup fee: 100 AZN (one-time) · 14-day free trial",
            ctaLabel: "Start 14-day trial",
            limits: [
              "WhatsApp + Instagram + Telegram",
              "AI assistant & instant replies",
              "Team assignment & operator handoff",
            ],
          },
          {
            id: "pro",
            name: "Pro",
            desc: "Full automation, multi-branch scheduling & AI sales assistant.",
            prices: { monthly: "149 AZN", halfYear: "134 AZN", annual: "119 AZN" },
            setupNote: "Setup fee: 100 AZN (one-time) · Priority onboarding",
            ctaLabel: "Choose Pro",
            limits: [
              "All channels + REST Webhook & n8n",
              "Unlimited custom CRM fields",
              "Full audit log & multi-branch control",
            ],
          },
          {
            id: "enterprise",
            name: "Enterprise",
            desc: "Dedicated PostgreSQL isolation, SLA & custom integrations.",
            prices: { monthly: "Custom", halfYear: "Custom", annual: "Custom" },
            setupNote: "Tailored for multi-branch businesses",
            ctaLabel: "Contact sales",
            limits: [
              "Dedicated isolated database",
              "Custom ERP / payment webhooks",
              "Dedicated technical account lead",
            ],
          },
        ]
      : [
          {
            id: "starter",
            name: "Başlanğıc",
            desc: "Vahid mesajlaşma və ilk CRM axınına keçən bizneslər üçün.",
            prices: { monthly: "49 AZN", halfYear: "44 AZN", annual: "39 AZN" },
            setupNote: "Quraşdırma haqqı yoxdur · 14 gün pulsuz sınaq",
            ctaLabel: "14 gün pulsuz sına",
            limits: [
              "1 kanal (Telegram qutusu)",
              "500 müraciətədək Kanban lövhəsi",
              "Təkrar rezervasiyalara nəzarət",
            ],
          },
          {
            id: "growth",
            name: "İnkişaf",
            desc: "WhatsApp Cloud API və avtomatik görüş rezervasiyası.",
            popular: true,
            popularBadge: "Ən populyar",
            prices: { monthly: "89 AZN", halfYear: "80 AZN", annual: "71 AZN" },
            setupNote: "Quraşdırma: 100 AZN (birdəfəlik) · 14 gün pulsuz sınaq",
            ctaLabel: "14 gün pulsuz sına",
            limits: [
              "WhatsApp + Instagram + Telegram",
              "AI köməkçi və sürətli cavablar",
              "Operator bölgüsü və canlı ötürmə",
            ],
          },
          {
            id: "pro",
            name: "Pro",
            desc: "Tam avtomatlaşdırma, çoxfiliallı idarəetmə və AI satış köməkçisi.",
            prices: { monthly: "149 AZN", halfYear: "134 AZN", annual: "119 AZN" },
            setupNote: "Quraşdırma: 100 AZN (birdəfəlik) · Fərdi qoşulma",
            ctaLabel: "Pro planını seç",
            limits: [
              "Bütün kanallar + REST Webhook & n8n",
              "Limitsiz fərdi CRM sahələri",
              "Tam audit jurnalı və filial nəzarəti",
            ],
          },
          {
            id: "enterprise",
            name: "Korporativ",
            desc: "Təcrid olunmuş PostgreSQL bazası, SLA və xüsusi inteqrasiyalar.",
            prices: { monthly: "Fərdi", halfYear: "Fərdi", annual: "Fərdi" },
            setupNote: "Çoxfiliallı bizneslər və xidmət şəbəkələri üçün",
            ctaLabel: "Satışla əlaqə",
            limits: [
              "Fərdi təcrid olunmuş verilənlər bazası",
              "Xüsusi ödəniş və ERP inteqrasiyası",
              "Fərdi texniki dəstək meneceri",
            ],
          },
        ];

  const proBenefits =
    locale === "en"
      ? [
          {
            title: "Omnichannel Inbox",
            desc: "Manage WhatsApp, Instagram DMs, and Telegram inquiries in one unified screen.",
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
            title: "Geniş çeşidli ünsiyyət",
            desc: "WhatsApp, Instagram DM və Telegram müraciətlərini tək vahid qutuda idarə edin.",
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
            q: "Can we switch between monthly and annual billing?",
            a: "Yes. You can start with a 14-day free trial and switch billing cycles without losing customer or lead records.",
          },
          {
            q: "What does the 100 AZN one-time setup fee cover?",
            a: "Growth and Pro plans include an optional 100 AZN one-time onboarding fee covering WhatsApp Cloud API / Instagram / Telegram setup, sales pipeline configuration, and team onboarding. Starter has no setup fee.",
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
            q: "Aylıq və illik ödəniş arasında keçid etmək mümkündür?",
            a: "Bəli. 14 günlük pulsuz sınaqla başlaya və məlumatlarınızı itirmədən istənilən vaxt ödəniş dövrünü dəyişə bilərsiniz.",
          },
          {
            q: "100 AZN birdəfəlik quraşdırma haqqı nələri əhatə edir?",
            a: "İnkişaf və Pro planlarında tətbiq olunan 100 AZN birdəfəlik quraşdırma haqqı WhatsApp Cloud API, Instagram və Telegram qoşulmasını, satış mərhələlərinin qurulmasını və komanda təlimini əhatə edir. Başlanğıc planında quraşdırma haqqı yoxdur.",
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
