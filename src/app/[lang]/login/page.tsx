import type { Metadata } from "next";
import { AuthKommoClient } from "@/components/marketing/AuthKommoClient";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Photo } from "@/components/Photo";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/login",
    title: d.subpages.authPages.login.title,
    description: d.subpages.authPages.login.subtitle,
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const login = s.authPages.login;

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
        routeSuffix="/login"
      />

      <main id="main" tabIndex={-1}>
        <section className="pm-auth-section">
          <div className="pm-auth-kommo">
            <Photo
              name="p-product-tour"
              alt={login.title}
              className="pm-auth-kommo-illustration"
              priority
            />
            <div className="pm-auth-kommo-card">
              <span className="pm-auth-kommo-badge">{login.badge}</span>
              <h1 className="pm-auth-kommo-title">{login.title}</h1>
              <p className="pm-auth-kommo-sub">{login.subtitle}</p>
              <AuthKommoClient
                lang={locale}
                copy={{
                  badge: login.badge,
                  title: login.title,
                  subtitle: login.subtitle,
                  keyLabel: login.keyLabel,
                  keyPlaceholder: login.keyPlaceholder,
                  showKey: login.showKey,
                  hideKey: login.hideKey,
                  submit: login.submit,
                  submitting: login.submitting,
                  invalidKey: login.invalidKey,
                  rateLimited: login.rateLimited,
                  networkError: login.networkError,
                  securityNote: login.securityNote,
                  noAccountText: login.noAccountText,
                  registerLink: login.registerLink,
                }}
                registerHref={`/${locale}/register`}
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
        routeSuffix="/login"
      />
    </div>
  );
}
