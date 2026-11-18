import type { Metadata } from "next";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, SubpageHero } from "@/components/marketing/SubpageBlocks";
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
  });
}

export default async function PricingPage({ params }: PageProps<"/[lang]/pricing">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const pricing = s.pricingPage;

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
        routeSuffix="/pricing"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={pricing.hero.badge}
          title={pricing.hero.title}
          subtitle={pricing.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bottomCta.primary }}
          secondaryCta={{ href: `/${locale}/contact`, label: s.common.bottomCta.secondary }}
          image="p-cases"
          imageAlt={pricing.hero.title}
        />

        <section className="pm-section">
          <div className="pm-wrap pm-matrix-wrap">
            <h2>{pricing.matrix.title}</h2>
            <p className="pm-subhero-sub">{pricing.matrix.subtitle}</p>
            <div className="pm-matrix-group">
              <button className="pm-matrix-toggle" type="button">
                {pricing.periods.annual}
              </button>
              <div className="pm-matrix-table-scroll">
                <table className="pm-matrix-table">
                  <thead>
                    <tr>
                      <th>{pricing.matrix.colFeature}</th>
                      {Object.entries(pricing.periods).map(([key, label]) => (
                        <th key={key}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pricing.matrix.categories).map(([catKey, category]) => (
                      <tr key={catKey}>
                        <td colSpan={Object.keys(pricing.periods).length + 1}>
                          {category.title}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        tagline={d.landing.footer.tagline}
        copyright={d.landing.footer.copyright}
        switchLabel={d.landing.footer.switchLabel}
        cols={s.footer}
        routeSuffix="/pricing"
      />
    </div>
  );
}
