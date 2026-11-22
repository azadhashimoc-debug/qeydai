import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import {
  BottomCtaBand,
  FeatureAlternating,
  FeatureGrid,
  SubpageHero,
} from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { SECTOR_IMAGES, SECTOR_SLUGS, isSectorSlug } from "@/lib/marketing/sectors";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.flatMap((lang) => SECTOR_SLUGS.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/scenarios/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isSectorSlug(slug)) notFound();
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const copy = d.subpages.sectors.items[slug];
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: `/scenarios/${slug}`,
    title: copy.title,
    description: copy.subtitle,
    brand: d.brand,
    image: `/images/${SECTOR_IMAGES[slug]}.webp`,
  });
}

export default async function SectorScenarioPage({
  params,
}: PageProps<"/[lang]/scenarios/[slug]">) {
  const { lang, slug } = await params;
  if (!isSectorSlug(slug)) notFound();

  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const c = s.sectors.items[slug];
  const ui = s.sectors.ui;
  const tones = ["lavender", "mint", "sky"] as const;
  const routeSuffix = `/scenarios/${slug}`;

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
          badge={ui.badge}
          title={c.title}
          subtitle={c.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bottomCta.primary }}
          secondaryCta={{ href: `/${locale}/pricing`, label: s.navGroups.resources.pricingTitle }}
          image={SECTOR_IMAGES[slug]}
          imageAlt={c.title}
          badgeVariant="amber"
        />

        <FeatureGrid
          heading={c.challengesTitle}
          columns={3}
          items={c.challenges.map((item, i) => ({ ...item, tone: tones[i] }))}
        />

        <FeatureGrid
          heading={c.workflowTitle}
          columns={3}
          items={c.workflow.map((item, i) => ({ ...item, tone: tones[i] }))}
        />

        <FeatureAlternating
          rows={[
            {
              tag: ui.badge,
              title: c.detailTitle,
              body: `${c.detailBody} ${ui.disclaimer}`,
              bullets: c.detailBullets,
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-booking",
              imageAlt: c.detailTitle,
              tone: "mint",
            },
          ]}
        />

        <FeatureGrid
          heading={ui.moreTitle}
          columns={4}
          items={[
            {
              title: d.subpages.navGroups.resources.fitnessTitle,
              desc: d.subpages.navGroups.resources.fitnessDesc,
              href: `/${locale}/scenarios/fitness-centers`,
              tone: "white",
            },
            ...SECTOR_SLUGS.filter((x) => x !== slug).map((x) => ({
              title: s.sectors.items[x].navLabel,
              desc: s.sectors.items[x].subtitle,
              href: `/${locale}/scenarios/${x}`,
              tone: "white" as const,
            })),
          ]}
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
