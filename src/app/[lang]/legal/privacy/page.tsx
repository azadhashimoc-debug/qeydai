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
}: PageProps<"/[lang]/legal/privacy">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/legal/privacy",
    title: d.subpages.legal.privacy.title,
    description: d.subpages.legal.privacy.subtitle,
    brand: d.brand,
  });
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/legal/privacy">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const p = s.legal.privacy;
  const sections = Object.values(p.sections);

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
        routeSuffix="/legal/privacy"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={s.common.badgeSample}
          title={p.title}
          subtitle={`${p.subtitle} · ${p.lastUpdated}`}
          primaryCta={{ href: `/${locale}/contact`, label: s.navGroups.resources.blogTitle }}
          secondaryCta={{ href: `/${locale}/legal/terms`, label: s.footer.cols.legal.terms }}
          image="p-cases"
          imageAlt={p.title}
          badgeVariant="mint"
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
                  {s.footer.cols.legal.contact}
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
        routeSuffix="/legal/privacy"
      />
    </div>
  );
}
