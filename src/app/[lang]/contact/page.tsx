import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import { LeadForm } from "../LeadForm";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/contact",
    title: d.subpages.contactPage.hero.title,
    description: d.subpages.contactPage.hero.subtitle,
    brand: d.brand,
    image: "/images/p-cases.webp",
  });
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;

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
        routeSuffix="/contact"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={s.contactPage.hero.badge}
          title={s.contactPage.hero.title}
          subtitle={s.contactPage.hero.subtitle}
          primaryCta={{ href: "#contact-form", label: s.contactPage.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/pricing`, label: s.contactPage.hero.ctaSecondary }}
          image="p-cases"
          imageAlt={s.contactPage.hero.title}
          badgeVariant="mint"
        />

        <section id="contact-form" className="pm-section">
          <div className="pm-wrap pm-cta-grid">
            <div className="pm-subhero-copy">
              <h2>{s.contactPage.formTitle}</h2>
              <p className="pm-subhero-sub">{s.contactPage.formSubtitle}</p>
              <p className="pm-auth-note" style={{ marginTop: 14 }}>
                {s.common.contactNote}
              </p>
            </div>

            <div className="pm-contact-card">
              <LeadForm
                locale={locale}
                labels={d.contact}
                okText={d.contact.ok}
                errText={d.contact.error}
                rateLimitedText={d.contact.rate_limited}
              />
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
        routeSuffix="/contact"
      />
    </div>
  );
}
