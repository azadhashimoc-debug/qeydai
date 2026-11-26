import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SubpageHero } from "@/components/marketing/SubpageBlocks";
import { getLegalEntityConfig } from "@/lib/marketing/contact-config";
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
  const entity = getLegalEntityConfig();

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
          badge={s.legal.badge}
          title={t.title}
          subtitle={`${t.subtitle} · ${t.lastUpdated}`}
          primaryCta={{ href: `/${locale}/contact`, label: s.legal.contactCta }}
          secondaryCta={{ href: `/${locale}/legal/privacy`, label: s.footer.cols.legal.privacy }}
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
              <section>
                <h2>{locale === "en" ? "Service provider details" : "Xidmət təminatçısının rekvizitləri"}</h2>
                <p>
                  {entity.companyName || entity.taxId || entity.address || entity.email
                    ? [
                        entity.companyName && `${locale === "en" ? "Legal entity" : "Hüquqi şəxs"}: ${entity.companyName}`,
                        entity.taxId && `${locale === "en" ? "Tax ID (VOEN)" : "VÖEN"}: ${entity.taxId}`,
                        entity.address && `${locale === "en" ? "Address" : "Ünvan"}: ${entity.address}`,
                        entity.email && `${locale === "en" ? "Email" : "E-poçt"}: ${entity.email}`,
                        entity.phone && `${locale === "en" ? "Phone" : "Telefon"}: ${entity.phone}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : locale === "en"
                      ? "Service provider: panelim.az (Baku, Azerbaijan). Full legal entity registration details (Tax ID and registered address) are published here prior to paid billing activation."
                      : "Xidmət təminatçısı: panelim.az (Bakı, Azərbaycan). Tam hüquqi rekvizitlər (hüquqi ad, VÖEN və rəsmi ünvan) ödənişli abunəlik aktivləşməzdən əvvəl bu bölmədə dərc olunur."}
                </p>
              </section>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "center" }}>
                <Link href={`/${locale}/legal/privacy`} className="pm-link-arrow">
                  {s.footer.cols.legal.privacy}
                </Link>
                <Link href={`/${locale}/legal/data-deletion`} className="pm-link-arrow">
                  {s.legal.dataDeletionLink}
                </Link>
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
        routeSuffix="/legal/terms"
      />
    </div>
  );
}
