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
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/scenarios/fitness-centers">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/scenarios/fitness-centers",
    title: d.subpages.fitnessScenario.hero.title,
    description: d.subpages.fitnessScenario.hero.subtitle,
    brand: d.brand,
    image: "/images/p-fitness.webp",
  });
}

export default async function FitnessScenarioPage({
  params,
}: PageProps<"/[lang]/scenarios/fitness-centers">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const f = s.fitnessScenario;

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
        routeSuffix="/scenarios/fitness-centers"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={`${s.common.sampleScenarioBadge} · ${f.hero.badge}`}
          title={f.hero.title}
          subtitle={f.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: f.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/pricing`, label: f.hero.ctaSecondary }}
          image="p-fitness"
          imageAlt={f.hero.title}
          badgeVariant="amber"
        />

        <FeatureGrid
          heading={f.workflow.title}
          columns={3}
          items={[
            {
              title: f.workflow.step1Title,
              desc: f.workflow.step1Desc,
              tone: "lavender",
            },
            {
              title: f.workflow.step2Title,
              desc: f.workflow.step2Desc,
              tone: "mint",
            },
            {
              title: f.workflow.step3Title,
              desc: f.workflow.step3Desc,
              tone: "sky",
            },
          ]}
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.common.sampleScenarioBadge,
              title: f.workflow.step2Title,
              body: f.workflow.step2Desc,
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-booking",
              imageAlt: f.workflow.step2Title,
              tone: "mint",
            },
            {
              tag: s.navGroups.product.inboxTitle,
              title: f.workflow.step1Title,
              body: f.workflow.step1Desc,
              cta: { href: `/${locale}/inbox`, label: s.navGroups.product.inboxTitle },
              image: "p-inbox",
              imageAlt: f.workflow.step1Title,
              tone: "lavender",
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
        routeSuffix="/scenarios/fitness-centers"
      />
    </div>
  );
}
