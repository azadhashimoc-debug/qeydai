import type { Metadata } from "next";
import { PricingShowcase } from "@/components/LandingInteractive";
import { PricingMatrixClient } from "@/components/marketing/PricingMatrixClient";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/pricing">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/pricing",
    title: d.subpages.pricingPage.hero.title,
    description: d.subpages.pricingPage.hero.subtitle,
    brand: d.brand,
    image: "/images/p-cases.webp",
  });
}

export default async function PricingPage({ params }: PageProps<"/[lang]/pricing">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const l = d.landing;
  const s = d.subpages;
  const faqEntries = Object.entries(d.faq.items);

  const pricingPlans = [
    {
      key: "starter",
      name: l.pricing.plans.starter.name,
      desc: l.pricing.plans.starter.desc,
      prices: l.pricing.plans.starter.prices,
      limits: [
        l.pricing.plans.starter.limits.one,
        l.pricing.plans.starter.limits.two,
        l.pricing.plans.starter.limits.three,
      ] as [string, string, string],
      cta: l.pricing.plans.starter.cta,
    },
    {
      key: "growth",
      name: l.pricing.plans.growth.name,
      desc: l.pricing.plans.growth.desc,
      prices: l.pricing.plans.growth.prices,
      limits: [
        l.pricing.plans.growth.limits.one,
        l.pricing.plans.growth.limits.two,
        l.pricing.plans.growth.limits.three,
      ] as [string, string, string],
      cta: l.pricing.plans.growth.cta,
      popular: true,
    },
    {
      key: "pro",
      name: l.pricing.plans.pro.name,
      desc: l.pricing.plans.pro.desc,
      prices: l.pricing.plans.pro.prices,
      limits: [
        l.pricing.plans.pro.limits.one,
        l.pricing.plans.pro.limits.two,
        l.pricing.plans.pro.limits.three,
      ] as [string, string, string],
      cta: l.pricing.plans.pro.cta,
    },
    {
      key: "enterprise",
      name: l.pricing.plans.enterprise.name,
      desc: l.pricing.plans.enterprise.desc,
      staticPrice: l.pricing.plans.enterprise.price,
      limits: [
        l.pricing.plans.enterprise.limits.one,
        l.pricing.plans.enterprise.limits.two,
        l.pricing.plans.enterprise.limits.three,
      ] as [string, string, string],
      cta: l.pricing.plans.enterprise.cta,
    },
  ];

  const planNames: [string, string, string, string] = [
    l.pricing.plans.starter.name,
    l.pricing.plans.growth.name,
    l.pricing.plans.pro.name,
    l.pricing.plans.enterprise.name,
  ];

  return (
    <div className="marketing">
      <a href="#main" className="skip-link">
        {d.a11y.skipToMain}
      </a>

      <SiteHeader
        lang={locale}
        brand={d.brand}
        a11y={d.a11y}
        nav={l.nav}
        subNav={s.navGroups}
        mode="subpage"
        routeSuffix="/pricing"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={s.pricingPage.hero.badge}
          title={s.pricingPage.hero.title}
          subtitle={s.pricingPage.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.pricingPage.hero.ctaPrimary }}
          secondaryCta={{ href: "#matrix", label: s.pricingPage.hero.ctaSecondary }}
          image="p-cases"
          imageAlt={s.pricingPage.hero.title}
        />

        <PricingShowcase
          heading={l.pricing.heading}
          subheading={l.pricing.subheading}
          periods={l.pricing.periods}
          periodNotes={l.pricing.periodNotes}
          perMonth={l.pricing.perMonth}
          popularLabel={l.pricing.popular}
          setupPrefix={l.pricing.setupPrefix}
          setupValue={l.pricing.setupValue}
          plans={pricingPlans}
          footnote={l.pricing.footnote}
          ctaHref={`/${locale}/demo`}
        />

        <section className="pm-section">
          <div className="pm-wrap">
            <PricingMatrixClient matrix={s.pricingPage.matrix} planNames={planNames} />
          </div>
        </section>

        <section className="pm-section pm-faq">
          <div className="pm-wrap pm-faq-inner">
            <div className="pm-section-head">
              <h2>{d.faq.title}</h2>
            </div>
            <div className="pm-faq-list">
              {faqEntries.map(([id, item]) => (
                <details key={id} className="pm-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

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
        tagline={l.footer.tagline}
        copyright={l.footer.copyright}
        switchLabel={l.footer.switchLabel}
        cols={s.footer}
        routeSuffix="/pricing"
      />
    </div>
  );
}
