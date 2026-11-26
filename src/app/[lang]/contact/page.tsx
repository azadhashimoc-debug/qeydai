import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { getPublicContactConfig } from "@/lib/marketing/contact-config";
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
  const publicContact = getPublicContactConfig();
  const directParts = [publicContact.phone, publicContact.email].filter(Boolean);

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
                <h3>
                  {publicContact.officeAddress
                    ? locale === "en"
                      ? "Baku Office"
                      : "Bakı Ofisi"
                    : locale === "en"
                      ? "Support Hours (Baku)"
                      : "Dəstək Saatları (Bakı)"}
                </h3>
                <p>
                  {publicContact.officeAddress
                    ? `${publicContact.officeAddress} · ${locale === "en" ? "Mon–Sat, 09:00–19:00" : "B.e–Ş., 09:00–19:00"}`
                    : locale === "en"
                      ? "Baku, Azerbaijan · Online support Mon–Sat, 09:00–19:00 (AZT)"
                      : "Bakı, Azərbaycan · Onlayn dəstək B.e–Ş., 09:00–19:00 (AZT)"}
                </p>
              </article>
              <article className="pm-contact-channel-card">
                <h3>{locale === "en" ? "WhatsApp & Telegram" : "WhatsApp və Telegram"}</h3>
                <p>
                  {locale === "en"
                    ? "Fast onboarding support for sales and service businesses."
                    : "Satış və xidmət biznesləri üçün operativ qoşulma dəstəyi."}
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
              {directParts.length > 0
                ? `${locale === "en" ? "Direct contact: " : "Birbaşa əlaqə: "}${directParts.join(" · ")}`
                : locale === "en"
                  ? "Submit the form below and our Baku team will reply within 1 business hour."
                  : "Aşağıdakı əlaqə formu vasitəsilə yazın — komandamız 1 iş saatı ərzində geri dönüş edir."}
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
          secondaryHref={`/${locale}/pricing`}
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
