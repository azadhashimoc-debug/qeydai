import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, FeatureGrid, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import { CASE_SLUGS, PAGES } from "../dictionaries/pages";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const HUB = {
  az: {
    badge: "Ssenarilər",
    title: "Tipik iş axını ssenariləri",
    subtitle: "Bunlar real müştəri hekayələri deyil, Panelim-in sektorlar üzrə necə işlədiyini göstərən nümunə ssenarilərdir.",
    cta: "Ssenariyə bax",
  },
  en: {
    badge: "Scenarios",
    title: "Typical workflow scenarios",
    subtitle: "These are not real customer stories. They are sample scenarios showing how Panelim works in different industries.",
    cta: "View scenario",
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/[lang]/cases">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/cases",
    title: HUB[locale].title,
    description: HUB[locale].subtitle,
    brand: d.brand,
    image: "/images/mobile-hero.webp",
  });
}

export default async function CasesHubPage({ params }: PageProps<"/[lang]/cases">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const h = HUB[locale];
  const tones = ["mint", "lavender"] as const;

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
        routeSuffix="/cases"
      />
      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={h.badge}
          title={h.title}
          subtitle={h.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bottomCta.primary }}
          secondaryCta={{ href: `/${locale}/industries`, label: locale === "en" ? "Industries" : "Sektorlar" }}
          image="mobile-hero"
          imageAlt={h.title}
        />
        <FeatureGrid
          columns={2}
          items={CASE_SLUGS.map((slug, i) => ({
            title: PAGES[`cases/${slug}`][locale].title,
            desc: PAGES[`cases/${slug}`][locale].subtitle,
            href: `/${locale}/cases/${slug}`,
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
        routeSuffix="/cases"
      />
    </div>
  );
}
