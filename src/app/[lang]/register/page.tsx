import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Photo } from "@/components/Photo";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import { LeadForm } from "../LeadForm";
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
          <div className="pm-wrap pm-auth-split">
            <div className="pm-auth-card">
              <span className="pm-subhero-badge pm-badge-mint" style={{ justifySelf: "start" }}>
                {reg.badge}
              </span>
              <h1>{reg.title}</h1>
              <p className="pm-subhero-sub">{reg.subtitle}</p>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--pm-ink)" }}>
                {reg.formTitle}
              </h2>
              <LeadForm
                locale={locale}
                labels={d.contact}
                okText={d.contact.ok}
                errText={d.contact.error}
                rateLimitedText={d.contact.rate_limited}
              />
              <div className="pm-auth-switch">
                <span>{reg.hasAccount}</span>
                <Link href={`/${locale}/login`}>{reg.loginLink}</Link>
              </div>
            </div>

            <div className="pm-auth-visual">
              <div className="pm-subhero-media">
                <Photo
                  name="p-demo"
                  alt={reg.title}
                  sizes="(max-width: 900px) 100vw, 480px"
                  priority
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--pm-ink)" }}>
                  {s.navGroups.product.bookingTitle} · {s.navGroups.product.aiTitle}
                </strong>
                <p className="pm-auth-note">{reg.subtitle}</p>
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
        routeSuffix="/register"
      />
    </div>
  );
}
