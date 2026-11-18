import type { Metadata } from "next";
import { AuthSplitClient } from "@/components/marketing/AuthSplitClient";
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
          <div className="pm-wrap pm-auth-split">
            <div className="pm-auth-card">
              <span className="pm-subhero-badge pm-badge-lavender" style={{ justifySelf: "start" }}>
                {login.badge}
              </span>
              <h1>{login.title}</h1>
              <p className="pm-subhero-sub">{login.subtitle}</p>
              <AuthSplitClient
                lang={locale}
                copy={login}
                registerHref={`/${locale}/register`}
              />
            </div>

            <div className="pm-auth-visual">
              <div className="pm-subhero-media">
                <Photo
                  name="p-product-tour"
                  alt={login.title}
                  sizes="(max-width: 900px) 100vw, 480px"
                  priority
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--pm-ink)" }}>
                  {s.navGroups.product.pipelineTitle} · {s.navGroups.product.inboxTitle}
                </strong>
                <p className="pm-auth-note">{s.navGroups.product.pipelineDesc}</p>
              </div>
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
