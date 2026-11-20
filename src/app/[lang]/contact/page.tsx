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
    image: "/images/p-contact-baku.webp",
  });
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const contact = s.contactPage;
  const form = contact.form;

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
          badge={contact.hero.badge}
          title={contact.hero.title}
          subtitle={contact.hero.subtitle}
          primaryCta={{ href: "#contact-form", label: form.submit }}
          secondaryCta={{ href: `/${locale}/demo`, label: s.common.bottomCta.primary }}
          image="p-contact-baku"
          imageAlt={contact.hero.title}
        />

        <section className="pm-section" style={{ paddingTop: "12px" }}>
          <div className="pm-wrap">
            <div className="pm-contact-channels-grid">
              <article className="pm-contact-channel-card">
                <h3>{locale === "en" ? "Baku Office" : "Bakı Ofisi"}</h3>
                <p>
                  {locale === "en"
                    ? "Nizami St., Baku, Azerbaijan · Mon–Sat, 09:00–19:00"
                    : "Nizami küç., Bakı, Azərbaycan · B.e–Ş., 09:00–19:00"}
                </p>
              </article>
              <article className="pm-contact-channel-card">
                <h3>{locale === "en" ? "WhatsApp & Telegram" : "WhatsApp və Telegram"}</h3>
                <p>
                  {locale === "en"
                    ? "Instant onboarding support for education & service centers."
                    : "Tədris və xidmət mərkəzləri üçün operativ qoşulma dəstəyi."}
                </p>
              </article>
              <article className="pm-contact-channel-card">
                <h3>{locale === "en" ? "Technical & API Team" : "Texniki və API Dəstəyi"}</h3>
                <p>
                  {locale === "en"
                    ? "n8n workflows, Meta Cloud API setup, and isolated workspace keys."
                    : "n8n axınları, Meta Cloud API bağlantısı və iş sahəsi açarları."}
                </p>
              </article>
            </div>
            <div className="pm-contact-direct-bar">
              {locale === "en"
                ? "Direct line: +994 50 000 00 00 · info@panelim.az"
                : "Birbaşa əlaqə: +994 50 000 00 00 · info@panelim.az"}
            </div>
          </div>
        </section>

        <section id="contact-form" className="pm-section">
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
