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

export async function generateMetadata({ params }: PageProps<"/[lang]/product">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/product",
    title: d.subpages.product.hero.title,
    description: d.subpages.product.hero.subtitle,
    brand: d.brand,
    image: "/images/p-product-tour.webp",
  });
}

export default async function ProductPage({ params }: PageProps<"/[lang]/product">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const p = s.product;

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
        routeSuffix="/product"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={p.hero.badge}
          title={p.hero.title}
          subtitle={p.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: p.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/channels`, label: p.hero.ctaSecondary }}
          image="p-product-tour"
          imageAlt={p.hero.title}
        />

        <FeatureGrid
          heading={p.modules.title}
          columns={3}
          items={[
            {
              title: p.modules.pipeline.title,
              desc: p.modules.pipeline.desc,
              href: `/${locale}/pipeline`,
              ctaLabel: s.navGroups.product.pipelineTitle,
              tone: "lavender",
            },
            {
              title: p.modules.inbox.title,
              desc: p.modules.inbox.desc,
              href: `/${locale}/inbox`,
              ctaLabel: s.navGroups.product.inboxTitle,
              tone: "mint",
            },
            {
              title: p.modules.ai.title,
              desc: p.modules.ai.desc,
              href: `/${locale}/ai`,
              ctaLabel: s.navGroups.product.aiTitle,
              tone: "sky",
            },
            {
              title: p.modules.booking.title,
              desc: p.modules.booking.desc,
              href: `/${locale}/booking`,
              ctaLabel: s.navGroups.product.bookingTitle,
              tone: "amber",
            },
            {
              title: p.modules.analytics.title,
              desc: p.modules.analytics.desc,
              href: `/${locale}/channels`,
              ctaLabel: s.navGroups.channels.hubTitle,
              tone: "white",
            },
          ]}
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.product.pipelineTitle,
              title: p.modules.pipeline.title,
              body: p.modules.pipeline.desc,
              cta: { href: `/${locale}/pipeline`, label: s.navGroups.product.pipelineTitle },
              image: "p-pipeline",
              imageAlt: p.modules.pipeline.title,
              tone: "lavender",
            },
            {
              tag: s.navGroups.product.inboxTitle,
              title: p.modules.inbox.title,
              body: p.modules.inbox.desc,
              cta: { href: `/${locale}/inbox`, label: s.navGroups.product.inboxTitle },
              image: "p-inbox",
              imageAlt: p.modules.inbox.title,
              tone: "mint",
            },
            {
              tag: s.navGroups.product.bookingTitle,
              title: p.modules.booking.title,
              body: p.modules.booking.desc,
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-booking",
              imageAlt: p.modules.booking.title,
              tone: "sky",
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
        routeSuffix="/product"
      />
    </div>
  );
}
