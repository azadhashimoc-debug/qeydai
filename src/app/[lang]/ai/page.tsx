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

export async function generateMetadata({ params }: PageProps<"/[lang]/ai">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/ai",
    title: d.subpages.ai.hero.title,
    description: d.subpages.ai.hero.subtitle,
    brand: d.brand,
    image: "/images/p-ai-copilot.webp",
  });
}

export default async function AiPage({ params }: PageProps<"/[lang]/ai">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const a = s.ai;

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
        routeSuffix="/ai"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={a.hero.badge}
          title={a.hero.title}
          subtitle={a.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: a.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/booking`, label: a.hero.ctaSecondary }}
          image="p-ai-copilot"
          imageAlt={a.hero.title}
        />

        <FeatureGrid
          heading={a.scenarios.title}
          columns={2}
          items={[
            {
              title: a.scenarios.one.title,
              desc: a.scenarios.one.desc,
              tone: "lavender",
            },
            {
              title: a.scenarios.two.title,
              desc: a.scenarios.two.desc,
              tone: "sky",
            },
            {
              title: a.scenarios.three.title,
              desc: a.scenarios.three.desc,
              tone: "mint",
            },
            {
              title: a.scenarios.four.title,
              desc: a.scenarios.four.desc,
              tone: "amber",
            },
          ]}
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.product.aiTitle,
              title: a.scenarios.three.title,
              body: a.scenarios.three.desc,
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-salesbot",
              imageAlt: a.scenarios.three.title,
              tone: "plum",
            },
            {
              tag: s.navGroups.product.inboxTitle,
              title: a.scenarios.four.title,
              body: a.scenarios.four.desc,
              cta: { href: `/${locale}/inbox`, label: s.navGroups.product.inboxTitle },
              image: "p-inbox",
              imageAlt: a.scenarios.four.title,
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
        routeSuffix="/ai"
      />
    </div>
  );
}
