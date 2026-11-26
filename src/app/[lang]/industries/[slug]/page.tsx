import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KommoTabbedShowcase } from "@/components/marketing/KommoTabbedShowcase";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, FeatureGrid, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { INDUSTRIES, INDUSTRY_SLUGS, isIndustrySlug } from "@/lib/marketing/industries";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.flatMap((lang) => INDUSTRY_SLUGS.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/industries/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isIndustrySlug(slug)) notFound();
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const industry = INDUSTRIES[slug];
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: `/industries/${slug}`,
    title: industry[locale].title,
    description: industry[locale].subtitle,
    brand: d.brand,
    image: `/images/${industry.image}.webp`,
  });
}

export default async function IndustryPage({ params }: PageProps<"/[lang]/industries/[slug]">) {
  const { lang, slug } = await params;
  if (!isIndustrySlug(slug)) notFound();
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const industry = INDUSTRIES[slug];
  const c = industry[locale];
  const routeSuffix = `/industries/${slug}`;
  const tones = ["lavender", "mint", "sky"] as const;

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
        routeSuffix={routeSuffix}
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={c.badge}
          title={c.title}
          subtitle={c.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bottomCta.primary }}
          secondaryCta={{ href: `/${locale}/pricing`, label: s.common.bottomCta.secondary }}
          image={industry.image}
          imageAlt={c.title}
          badgeVariant={industry.badgeVariant}
        />

        <KommoTabbedShowcase heading={c.showcaseHeading} subheading={c.showcaseSub} tabs={c.tabs} />

        <FeatureGrid
          columns={3}
          items={c.steps.map((step, i) => ({
            title: step.title,
            desc: step.desc,
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
        routeSuffix={routeSuffix}
      />
    </div>
  );
}
