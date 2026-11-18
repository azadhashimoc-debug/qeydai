import type { Metadata } from "next";
import Link from "next/link";
import { AuthKommoRegisterClient } from "@/components/marketing/AuthKommoRegisterClient";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Photo } from "@/components/Photo";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/register">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/register",
    title: d.subpages.authPages.register.title,
    description: d.subpages.authPages.register.subtitle,
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function RegisterPage({ params }: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const reg = s.authPages.register;

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
        routeSuffix="/register"
      />

      <main id="main" tabIndex={-1}>
        <section className="pm-auth-section">
          <div className="pm-auth-kommo">
            <Photo
              name="p-demo"
              alt={reg.title}
              className="pm-auth-kommo-illustration"
              priority
            />
            <div className="pm-auth-kommo-card">
              <span className="pm-auth-kommo-badge">{reg.badge}</span>
              <h1 className="pm-auth-kommo-title">{reg.title}</h1>
              <p className="pm-auth-kommo-sub">{reg.subtitle}</p>
              <AuthKommoRegisterClient
                locale={locale}
                copy={{
                  badge: reg.badge,
                  title: reg.title,
                  subtitle: reg.subtitle,
                  formTitle: reg.formTitle,
                  name: reg.form.nameLabel,
                  namePlaceholder: reg.form.namePlaceholder,
                  phone: reg.form.phoneLabel,
                  phonePlaceholder: reg.form.phonePlaceholder,
                  submit: reg.form.submit,
                  sending: reg.form.submitting,
                  nameRequired: reg.form.nameRequired,
                  privacy: reg.form.privacyNote,
                  okText: reg.form.successTitle,
                  errText: reg.form.successBody,
                  rateLimitedText: reg.form.rateLimited,
                  hasAccount: reg.hasAccount,
                  loginLink: reg.loginLink,
                }}
                loginHref={`/${locale}/login`}
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter
        lang={locale}
        other={other}
        tagline={d.landing.footer.tagline}
        copyright={d.landing.footer.copyright}
        switchLabel={d.landing.footer.switchLabel}
        cols={s.footer}
        routeSuffix="/register"
      />
    </div>
  );
}
