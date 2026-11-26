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

export async function generateMetadata({ params }: PageProps<"/[lang]/demo">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/demo",
    title: d.subpages.demoPage.hero.title,
    description: d.subpages.demoPage.hero.subtitle,
    brand: d.brand,
    image: "/images/p-demo.webp",
  });
}

export default async function DemoPage({ params }: PageProps<"/[lang]/demo">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const demo = s.demoPage;
  const form = demo.form;

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
        routeSuffix="/demo"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={demo.hero.badge}
          title={demo.hero.title}
          subtitle={demo.hero.subtitle}
          primaryCta={{ href: "#demo-form", label: form.submit }}
          secondaryCta={{ href: `/${locale}/pricing`, label: s.common.bottomCta.secondary }}
          image="p-demo-stats"
          imageAlt={demo.hero.title}
        />

        <section className="pm-demo-stats-band">
          <div className="pm-wrap pm-demo-stats-grid">
            <div className="pm-demo-stat">
              <strong>24/7</strong>
              <span>
                {locale === "en"
                  ? "Automated appointment booking"
                  : "Avtomatik görüş rezervasiyası"}
              </span>
            </div>
            <div className="pm-demo-stat">
              <strong>{locale === "en" ? "3 Channels" : "3 Kanal"}</strong>
              <span>
                {locale === "en"
                  ? "WhatsApp, Instagram & Telegram in one inbox"
                  : "WhatsApp, Instagram və Telegram tək qutuda"}
              </span>
            </div>
            <div className="pm-demo-stat">
              <strong>&lt; 30 {locale === "en" ? "sec" : "san"}</strong>
              <span>
                {locale === "en"
                  ? "Instant lead capture with duplicate protection"
                  : "Təkrar qeydiyyat qoruması ilə ani cavab"}
              </span>
            </div>
          </div>
        </section>

        <section id="demo-form" className="pm-section">
          <div className="pm-wrap pm-cta-grid">
            <div className="pm-subhero-copy">
              <h2>{form.title}</h2>
              <p className="pm-subhero-sub">{form.subtitle}</p>
            </div>

            <div className="pm-contact-card">
              <LeadForm
                locale={locale}
                labels={{
                  name: form.nameLabel,
                  namePlaceholder: form.namePlaceholder,
                  phone: form.phoneLabel,
                  phonePlaceholder: form.phonePlaceholder,
                  submit: form.submit,
                  sending: form.submitting,
                  privacy: form.privacyNote,
                  nameRequired: form.nameRequired,
                }}
                okText={form.successTitle}
                errText={form.invalidPhone}
                rateLimitedText={form.rateLimited}
              />
            </div>
          </div>
        </section>

        <BottomCtaBand
          title={s.common.bottomCta.title}
          subtitle={s.common.bottomCta.subtitle}
          primaryHref={`/${locale}/contact`}
          primaryLabel={s.common.bottomCta.primary}
          secondaryHref={`/${locale}/register`}
          secondaryLabel={s.authPages.login.noAccount}
        />
      </main>

      <SiteFooter
        lang={locale}
        other={other}
        tagline={d.landing.footer.tagline}
        copyright={d.landing.footer.copyright}
        switchLabel={d.landing.footer.switchLabel}
        cols={s.footer}
        routeSuffix="/demo"
      />
    </div>
  );
}
