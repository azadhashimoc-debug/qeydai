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
        routeSuffix="/legal/privacy"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={s.legal.badge}
          title={p.title}
          subtitle={`${p.subtitle} · ${p.lastUpdated}`}
          primaryCta={{ href: `/${locale}/contact`, label: s.legal.contactCta }}
          secondaryCta={{ href: `/${locale}/legal/data-deletion`, label: s.legal.dataDeletionLink }}
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
              <section>
                <h2>{locale === "en" ? "Data controller details" : "Məlumat operatorunun rekvizitləri"}</h2>
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
                      ? "Operator: panelim.az (Baku, Azerbaijan). Full legal entity registration details (Tax ID and registered address) are published here prior to paid billing activation. For privacy inquiries, use the contact form."
                      : "Operator: panelim.az (Bakı, Azərbaycan). Tam hüquqi rekvizitlər (hüquqi ad, VÖEN və rəsmi ünvan) ödənişli abunəlik aktivləşməzdən əvvəl bu bölmədə dərc olunur. Məxfilik müraciətləri üçün əlaqə formasından istifadə edin."}
                </p>
              </section>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "center" }}>
                <Link href={`/${locale}/legal/data-deletion`} className="pm-link-arrow">
                  {s.legal.dataDeletionLink}
                </Link>
                <Link href={`/${locale}/legal/terms`} className="pm-link-arrow">
                  {s.footer.cols.legal.terms}
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
        routeSuffix="/legal/privacy"
      />
    </div>
  );
}
