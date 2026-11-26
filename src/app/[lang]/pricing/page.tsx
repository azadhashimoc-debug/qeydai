import type { Metadata } from "next";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { PricingMatrixClient } from "@/components/marketing/PricingMatrixClient";
import { PricingTiersClient, type PricingTier } from "@/components/marketing/PricingTiersClient";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, FeatureGrid, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { PLAN_SETUP_FEE_AZN, TRIAL_DAYS } from "@/lib/marketing/pricing";
import { pricingJsonLd } from "@/lib/marketing/pricing-jsonld";
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://panelim.az";
  const register = `/${locale}/register`;
  const tiers: PricingTier[] =
    locale === "en"
      ? [
          {
            id: "starter",
            name: "Starter",
            desc: "For small businesses bringing Telegram and Instagram enquiries into one inbox.",
            setupNote: "Per workspace · No setup fee",
            ctaLabel: `Start ${TRIAL_DAYS}-day free trial`,
            ctaHref: register,
            limits: [
              "Telegram + Instagram Direct inbox",
              "Kanban sales pipeline",
              "Duplicate enquiry checks",
            ],
          },
          {
            id: "growth",
            name: "Growth",
            desc: "Adds WhatsApp Cloud API, bookings and team handoff.",
            setupNote: `Per workspace · ${PLAN_SETUP_FEE_AZN.growth} AZN one-time setup`,
            ctaLabel: `Start ${TRIAL_DAYS}-day free trial`,
            ctaHref: register,
            limits: [
              "WhatsApp + Instagram + Telegram",
              "Pani AI assistant and quick replies",
              "Team assignment & operator handoff",
            ],
          },
          {
            id: "pro",
            name: "Pro",
            desc: "For businesses with several branches that want the full automation set.",
            popular: true,
            popularBadge: "Most Popular",
            setupNote: `Per workspace · ${PLAN_SETUP_FEE_AZN.pro} AZN one-time setup · onboarding in Baku`,
            ctaLabel: `Start ${TRIAL_DAYS}-day free trial`,
            ctaHref: register,
            limits: [
              "All channels + REST Webhook & n8n",
              "Unlimited custom CRM fields",
              "Activity log & branch control",
            ],
          },
          {
            id: "enterprise",
            name: "Enterprise",
            desc: "Custom contract, SLA and integrations.",
            customPrice: "Custom",
            setupNote: "For multi-branch businesses and service networks",
            ctaLabel: "Contact sales",
            ctaHref: `/${locale}/contact`,
            limits: [
              "Custom contract and SLA",
              "Custom payment / ERP integrations",
              "Dedicated account manager",
            ],
          },
        ]
      : [
          {
            id: "starter",
            name: "Başlanğıc",
            desc: "Telegram və Instagram müraciətlərini bir qutuda toplamağa başlayan kiçik bizneslər üçün.",
            setupNote: "İş sahəsi üzrə · Quraşdırma haqqı yoxdur",
            ctaLabel: `${TRIAL_DAYS} gün pulsuz sına`,
            ctaHref: register,
            limits: [
              "Telegram + Instagram Direct qutusu",
              "Kanban satış lövhəsi",
              "Təkrar müraciət yoxlaması",
            ],
          },
          {
            id: "growth",
            name: "İnkişaf",
            desc: "WhatsApp Cloud API, görüş rezervasiyası və komanda bölgüsü əlavə olunur.",
            setupNote: `İş sahəsi üzrə · ${PLAN_SETUP_FEE_AZN.growth} AZN birdəfəlik quraşdırma`,
            ctaLabel: `${TRIAL_DAYS} gün pulsuz sına`,
            ctaHref: register,
            limits: [
              "WhatsApp + Instagram + Telegram",
              "Pani AI köməkçi və hazır cavablar",
              "Operator bölgüsü və canlı ötürmə",
            ],
          },
          {
            id: "pro",
            name: "Pro",
            desc: "Bir neçə filialı olan və tam avtomatlaşdırma istəyən bizneslər üçün.",
            popular: true,
            popularBadge: "Ən Populyar",
            setupNote: `İş sahəsi üzrə · ${PLAN_SETUP_FEE_AZN.pro} AZN birdəfəlik quraşdırma · Bakıda yerində`,
            ctaLabel: `${TRIAL_DAYS} gün pulsuz sına`,
            ctaHref: register,
            limits: [
              "Bütün kanallar + REST Webhook və n8n",
              "Limitsiz fərdi CRM sahələri",
              "Fəaliyyət jurnalı və filial nəzarəti",
            ],
          },
          {
            id: "enterprise",
            name: "Korporativ",
            desc: "Fərdi müqavilə, SLA və xüsusi inteqrasiyalar.",
            customPrice: "Fərdi",
            setupNote: "Çoxfiliallı bizneslər və xidmət şəbəkələri üçün",
            ctaLabel: "Satışla əlaqə",
            ctaHref: `/${locale}/contact`,
            limits: [
              "Fərdi müqavilə və SLA",
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
            desc: "Operate separate Baku branches with isolated schedules and operator roles.",
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
            desc: "İlk mesajdan ödənişli qeydiyyata qədər bütün satış mərhələlərini AZN ilə izləyin.",
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
            q: "WhatsApp Cloud API üçün əlavə ödəniş varmı?",
            a: "panelim.az abunəliyi CRM, bot və avtomatlaşdırma mühərrikini əhatə edir. Rəsmi Meta mesaj tarifləri birbaşa Meta hesabınız üzərindən hesablanır.",
          },
          {
            q: "Biznesimizin müştəri məlumatları digər iş sahələrindən ayrıdır?",
            a: "Bəli. Hər bir iş sahəsi verilənlər bazası və API açarı səviyyəsində tam təcrid olunmuş şəkildə saxlanılır.",
          },
        ];

  return (
    <div className="marketing">
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              pricingJsonLd(siteUrl, locale, d.brand, {
                starter: tiers[0].name,
                growth: tiers[1].name,
                pro: tiers[2].name,
              }),
            ).replace(/</g, "\\u003c"),
          }}
        />
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
          heading={locale === "en" ? "Why teams choose Pro" : "Komandalar niyə Pro-nu seçir?"}
          subheading={
            locale === "en"
              ? "Built to turn customer conversations into sales."
              : "Müştəri yazışmalarını satışa çevirmək üçün qurulub."
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
