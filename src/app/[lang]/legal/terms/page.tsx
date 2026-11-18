import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SubpageHero } from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/legal/terms">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/legal/terms",
    title: d.subpages.legal.terms.title,
    description: d.subpages.legal.terms.subtitle,
    brand: d.brand,
  });
}

export default async function TermsPage({ params }: PageProps<"/[lang]/legal/terms">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const t = s.legal.terms;
  const sections = Object.values(t.sections);

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
        routeSuffix="/legal/terms"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={t.badge}
          title={t.title}
          subtitle={`${t.subtitle} (${t.updatedAt})`}
          primaryCta={{ href: `/${locale}/contact`, label: s.navGroups.resources.contactTitle }}
          secondaryCta={{ href: `/${locale}/legal/privacy`, label: s.footer.legalCol.privacy }}
          image="p-cases"
          imageAlt={t.title}
        />

        <section className="pm-section">
          <div className="pm-wrap">
            <div className="pm-legal-card">
              {sections.map((sec) => (
                <section key={sec.title}>
                  <h2>{sec.title}</h2>
                  <p>{sec.body}</p>
                </section>
              ))}
              <div>
                <Link href={`/${locale}/contact`} className="pm-link-arrow">
                  {s.navGroups.resources.contactTitle}
                </Link>
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
        routeSuffix="/legal/terms"
      />
    </div>
  );
}
