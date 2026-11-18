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

export async function generateMetadata({ params }: PageProps<"/[lang]/inbox">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/inbox",
    title: d.subpages.inbox.hero.title,
    description: d.subpages.inbox.hero.subtitle,
    brand: d.brand,
    image: "/images/p-inbox.webp",
  });
}

export default async function InboxPage({ params }: PageProps<"/[lang]/inbox">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const i = s.inbox;

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
        routeSuffix="/inbox"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={i.hero.badge}
          title={i.hero.title}
          subtitle={i.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: i.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/ai`, label: i.hero.ctaSecondary }}
          image="p-inbox"
          imageAlt={i.hero.title}
          badgeVariant="mint"
        />

        <FeatureGrid
          columns={2}
          items={[
            {
              title: i.features.multiChannel.title,
              desc: i.features.multiChannel.desc,
              tone: "mint",
            },
            {
              title: i.features.quickTemplates.title,
              desc: i.features.quickTemplates.desc,
              tone: "lavender",
            },
            {
              title: i.features.teamHandoff.title,
              desc: i.features.teamHandoff.desc,
              tone: "sky",
            },
            {
              title: i.features.historyAudit.title,
              desc: i.features.historyAudit.desc,
              tone: "amber",
            },
          ]}
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.channels.hubTitle,
              title: i.features.multiChannel.title,
              body: i.features.multiChannel.desc,
              cta: { href: `/${locale}/channels`, label: s.navGroups.channels.hubTitle },
              image: "p-channels",
              imageAlt: i.features.multiChannel.title,
              tone: "lavender",
            },
            {
              tag: s.navGroups.product.aiTitle,
              title: i.features.teamHandoff.title,
              body: i.features.teamHandoff.desc,
              cta: { href: `/${locale}/ai`, label: s.navGroups.product.aiTitle },
              image: "p-ai-copilot",
              imageAlt: i.features.teamHandoff.title,
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
        routeSuffix="/inbox"
      />
    </div>
  );
}
