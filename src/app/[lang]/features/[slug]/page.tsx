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
import {
  FEATURE_IMAGES,
  FEATURE_SLUGS,
  FEATURE_STATUS,
  isFeatureSlug,
} from "@/lib/marketing/features";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.flatMap((lang) => FEATURE_SLUGS.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/features/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isFeatureSlug(slug)) notFound();
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const copy = d.subpages.features.items[slug];
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: `/features/${slug}`,
    title: copy.title,
    description: copy.subtitle,
    brand: d.brand,
    image: `/images/${FEATURE_IMAGES[slug]}.webp`,
  });
}

export default async function FeaturePage({ params }: PageProps<"/[lang]/features/[slug]">) {
  const { lang, slug } = await params;
  if (!isFeatureSlug(slug)) notFound();

  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const c = s.features.items[slug];
  const ui = s.features.ui;
  const soon = FEATURE_STATUS[slug] === "soon";
  const tones = ["lavender", "mint", "sky"] as const;
  const routeSuffix = `/features/${slug}`;
  const note = "note" in c ? c.note : undefined;

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
          badge={soon ? ui.badgeSoon : ui.badgeLive}
          title={c.title}
          subtitle={soon ? `${c.subtitle} ${ui.soonNote}` : c.subtitle}
          primaryCta={
            soon
              ? { href: `/${locale}/contact`, label: ui.soonCta }
              : { href: `/${locale}/demo`, label: s.common.bottomCta.primary }
          }
          secondaryCta={{ href: `/${locale}/pricing`, label: s.navGroups.resources.pricingTitle }}
          image={FEATURE_IMAGES[slug]}
          imageAlt={c.title}
          badgeVariant={soon ? "amber" : "mint"}
        />

        <FeatureGrid
          heading={c.problemsTitle}
          columns={3}
          items={c.problems.map((item, i) => ({ ...item, tone: tones[i] }))}
        />

        <FeatureGrid
          heading={c.howTitle}
          columns={3}
          items={c.how.map((item, i) => ({ ...item, tone: tones[i] }))}
        />

        <FeatureAlternating
          rows={[
            {
              tag: soon ? ui.badgeSoon : ui.badgeLive,
              title: c.detailTitle,
              body: [c.detailBody, note, ui.disclaimer].filter(Boolean).join(" "),
              bullets: c.detailBullets,
              image: "p-product-tour",
              imageAlt: c.detailTitle,
              tone: "mint",
            },
          ]}
        />

        <FeatureGrid
          heading={ui.moreTitle}
          columns={4}
          items={FEATURE_SLUGS.filter((x) => x !== slug).map((x) => ({
            title: s.features.items[x].navLabel,
            desc: s.features.items[x].subtitle,
            href: `/${locale}/features/${x}`,
            tone: "white" as const,
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
