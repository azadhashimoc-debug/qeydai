import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import {
  BottomCtaBand,
  FeatureAlternating,
  FeatureGrid,
  SubpageHero,
} from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/pipeline">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/pipeline",
    title: d.subpages.pipeline.hero.title,
    description: d.subpages.pipeline.hero.subtitle,
    brand: d.brand,
    image: "/images/p-pipeline.webp",
  });
}

export default async function PipelinePage({ params }: PageProps<"/[lang]/pipeline">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const p = s.pipeline;

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
        routeSuffix="/pipeline"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={p.hero.badge}
          title={p.hero.title}
          subtitle={p.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: p.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/inbox`, label: p.hero.ctaSecondary }}
          image="p-pipeline"
          imageAlt={p.hero.title}
        />

        <FeatureGrid
          columns={2}
          items={[
            {
              title: p.features.stageControl.title,
              desc: p.features.stageControl.desc,
              tone: "lavender",
            },
            {
              title: p.features.leadClaim.title,
              desc: p.features.leadClaim.desc,
              tone: "mint",
            },
            {
              title: p.features.notesAndTasks.title,
              desc: p.features.notesAndTasks.desc,
              tone: "sky",
            },
            {
              title: p.features.antiDuplicate.title,
              desc: p.features.antiDuplicate.desc,
              tone: "amber",
            },
          ]}
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.product.inboxTitle,
              title: p.features.leadClaim.title,
              body: p.features.leadClaim.desc,
              cta: { href: `/${locale}/inbox`, label: s.navGroups.product.inboxTitle },
              image: "p-inbox",
              imageAlt: p.features.leadClaim.title,
              tone: "sky",
            },
            {
              tag: s.navGroups.product.bookingTitle,
              title: p.features.antiDuplicate.title,
              body: p.features.antiDuplicate.desc,
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-booking",
              imageAlt: p.features.antiDuplicate.title,
              tone: "mint",
            },
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
        routeSuffix="/pipeline"
      />
    </div>
  );
}
