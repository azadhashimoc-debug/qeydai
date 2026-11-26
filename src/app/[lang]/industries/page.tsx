import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, FeatureGrid, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { INDUSTRIES, INDUSTRY_SLUGS } from "@/lib/marketing/industries";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const HUB = {
  az: {
    badge: "Sektorlar",
    title: "Hər sektor üçün hazır iş axını",
    subtitle: "Klinika, salon, əmlak, mağaza və təhsil mərkəzləri üçün müraciətdən satışa qədər vahid panel.",
    cta: "Ətraflı bax",
  },
  en: {
    badge: "Industries",
    title: "A ready workflow for every industry",
    subtitle: "One panel from enquiry to sale for clinics, salons, real estate, shops and learning centers.",
    cta: "Learn more",
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/[lang]/industries">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/industries",
    title: HUB[locale].title,
    description: HUB[locale].subtitle,
    brand: d.brand,
    image: "/images/industry-clinic.webp",
  });
}

export default async function IndustriesHubPage({ params }: PageProps<"/[lang]/industries">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const h = HUB[locale];
  const tones = ["lavender", "mint", "sky", "amber", "white"] as const;

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
        routeSuffix="/industries"
      />
      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={h.badge}
          title={h.title}
          subtitle={h.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bottomCta.primary }}
          secondaryCta={{ href: `/${locale}/pricing`, label: s.common.bottomCta.secondary }}
          image="industry-beauty"
          imageAlt={h.title}
        />
        <FeatureGrid
          columns={3}
          items={INDUSTRY_SLUGS.map((slug, i) => ({
            title: INDUSTRIES[slug][locale].name,
            desc: INDUSTRIES[slug][locale].subtitle,
            href: `/${locale}/industries/${slug}`,
            ctaLabel: h.cta,
            tone: tones[i % tones.length],
          }))}
        />
        <BottomCtaBand
          title={s.common.bottomCta.title}
          subtitle={s.common.bottomCta.subtitle}
          primaryHref={`/${locale}/demo`}
          primaryLabel={s.common.bottomCta.primary}
          secondaryHref={`/${locale}/login`}
          secondaryLabel={s.common.bottomCta.secondary}
        />
      </main>
      <SiteFooter
        lang={locale}
        other={other}
        tagline={d.landing.footer.tagline}
        copyright={d.landing.footer.copyright}
        switchLabel={d.landing.footer.switchLabel}
        cols={s.footer}
        routeSuffix="/industries"
      />
    </div>
  );
}
