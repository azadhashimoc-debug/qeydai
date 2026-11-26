import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SubpageHero } from "@/components/marketing/SubpageBlocks";
import { getCompanyInfo } from "@/lib/marketing/company";
import { fillLegalTokens, getLegalDoc, type LegalKind } from "@/lib/marketing/legal";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary } from "@/app/[lang]/dictionaries";

const ROUTE: Record<LegalKind, `/legal/${string}`> = {
  privacy: "/legal/privacy",
  terms: "/legal/terms",
  "data-deletion": "/legal/data-deletion",
};

export async function legalMetadata(kind: LegalKind, lang: string): Promise<Metadata> {
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const doc = getLegalDoc(kind, locale);
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: ROUTE[kind],
    title: doc.title,
    description: doc.subtitle,
    brand: d.brand,
  });
}

export async function LegalPage({ kind, lang }: { kind: LegalKind; lang: string }) {
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const doc = getLegalDoc(kind, locale);
  const company = getCompanyInfo();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://panelim.az").replace(/\/$/, "");
  const values = {
    legalName: company.legalName,
    taxId: company.taxId,
    address: company.address,
    privacyEmail: company.privacyEmail,
    siteUrl,
  };
  const missingLabel = locale === "en" ? "to be filled" : "doldurulacaq";
  const secondary =
    kind === "terms"
      ? { href: `/${locale}/legal/privacy`, label: s.footer.cols.legal.privacy }
      : { href: `/${locale}/legal/terms`, label: s.footer.cols.legal.terms };

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
        routeSuffix={ROUTE[kind]}
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={locale === "en" ? "Legal" : "Hüquqi məlumat"}
          title={doc.title}
          subtitle={`${doc.subtitle} · ${doc.updated}`}
          primaryCta={{ href: `/${locale}/contact`, label: s.footer.cols.legal.contact }}
          secondaryCta={secondary}
          image="p-cases"
          imageAlt={doc.title}
          badgeVariant="mint"
        />

        <section className="pm-section">
          <div className="pm-wrap">
            <div className="pm-legal-card">
              {doc.sections.map((sec) => (
                <section key={sec.title}>
                  <h2>{sec.title}</h2>
                  {sec.paras.map((para) => (
                    <p key={para}>
                      {fillLegalTokens(para, values, locale).map((part, i) =>
                        "text" in part ? (
                          <span key={i}>{part.text}</span>
                        ) : (
                          <mark key={i} className="pm-legal-missing" title={missingLabel}>
                            [{part.missing}: {missingLabel}]
                          </mark>
                        ),
                      )}
                    </p>
                  ))}
                </section>
              ))}
              <div className="pm-legal-links">
                {kind !== "data-deletion" && (
                  <Link href={`/${locale}/legal/data-deletion`} className="pm-link-arrow">
                    {locale === "en" ? "Data deletion" : "Məlumatların silinməsi"}
                  </Link>
                )}
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
        routeSuffix={ROUTE[kind]}
      />
    </div>
  );
}
