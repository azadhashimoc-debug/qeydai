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

export async function generateMetadata({ params }: PageProps<"/[lang]/booking">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/booking",
    title: d.subpages.booking.hero.title,
    description: d.subpages.booking.hero.subtitle,
    brand: d.brand,
    image: "/images/p-booking.webp",
  });
}

export default async function BookingPage({ params }: PageProps<"/[lang]/booking">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const b = s.booking;

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
        routeSuffix="/booking"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={b.hero.badge}
          title={b.hero.title}
          subtitle={b.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: b.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/inbox`, label: b.hero.ctaSecondary }}
          image="p-booking"
          imageAlt={b.hero.title}
          badgeVariant="mint"
        />

        <FeatureGrid
          columns={2}
          items={[
            {
              title: b.features.capacityLock.title,
              desc: b.features.capacityLock.desc,
              tone: "mint",
            },
            {
              title: b.features.antiSpam.title,
              desc: b.features.antiSpam.desc,
              tone: "amber",
            },
            {
              title: b.features.calendarSync.title,
              desc: b.features.calendarSync.desc,
              tone: "sky",
            },
            {
              title: b.features.managerAlerts.title,
              desc: b.features.managerAlerts.desc,
              tone: "lavender",
            },
          ]}
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.product.pipelineTitle,
              title: b.features.capacityLock.title,
              body: b.features.capacityLock.desc,
              cta: { href: `/${locale}/pipeline`, label: s.navGroups.product.pipelineTitle },
              image: "p-pipeline",
              imageAlt: b.features.capacityLock.title,
              tone: "lavender",
            },
            {
              tag: s.navGroups.product.aiTitle,
              title: b.features.managerAlerts.title,
              body: b.features.managerAlerts.desc,
              cta: { href: `/${locale}/ai`, label: s.navGroups.product.aiTitle },
              image: "p-ai-copilot",
              imageAlt: b.features.managerAlerts.title,
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
        routeSuffix="/booking"
      />
    </div>
  );
}
