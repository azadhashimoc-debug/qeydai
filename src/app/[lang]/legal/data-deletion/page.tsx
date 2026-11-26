import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DataDeletionStatus } from "@/components/marketing/DataDeletionStatus";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SubpageHero } from "@/components/marketing/SubpageBlocks";
import { getSiteUrl } from "@/lib/http/site-url";
import { getLegalEntityConfig } from "@/lib/marketing/contact-config";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/legal/data-deletion">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/legal/data-deletion",
    title: locale === "en" ? "User Data Deletion" : "Məlumatların Silinməsi",
    description:
      locale === "en"
        ? "How to request deletion of your panelim.az account, workspace data, and connected Meta/Google integrations."
        : "panelim.az hesabınızın, iş sahəsi məlumatlarının və qoşulmuş Meta/Google inteqrasiyalarının silinməsi qaydası.",
    brand: d.brand,
  });
}

export default async function DataDeletionPage({
  params,
}: PageProps<"/[lang]/legal/data-deletion">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const entity = getLegalEntityConfig();
  const callbackUrl = `${getSiteUrl()}/api/legal/meta-data-deletion`;

  const copy =
    locale === "en"
      ? {
          badge: "Legal & Privacy",
          title: "User Data Deletion",
          subtitle: "How to delete your panelim.az account, connected Facebook/Instagram/WhatsApp data, or Google sign-in link.",
          contactCta: "Submit deletion request",
          sections: [
            {
              title: "1. What data can be deleted",
              body: "You may request permanent deletion of your panelim.az account credentials, OAuth links (Google/Facebook), workspace contacts, deals, message history, and connected messaging channel credentials.",
            },
            {
              title: "2. How to submit a deletion request",
              body: entity.email
                ? `Send a deletion request from your registered email address to ${entity.email} or submit it through the contact form on panelim.az with the subject "Data Deletion". Include your account email and workspace ID if known.`
                : 'Submit a deletion request through the contact form on panelim.az with the subject "Data Deletion" and include your registered email address or phone number so we can verify account ownership.',
            },
            {
              title: "3. Removing Facebook / Instagram access directly in Meta",
              body: "You can also revoke panelim.az permissions directly from your Facebook Settings -> Apps and Websites -> panelim.az -> Remove. When triggered via Meta, our automated Data Deletion Callback logs the request and issues a confirmation code.",
            },
            {
              title: "4. Processing timeline",
              body: "Verified deletion requests are completed within 30 calendar days. Active backups expire on their standard rotation cycle. Financial invoices or records required by Azerbaijani tax legislation are retained only for the statutory period.",
            },
          ],
          callbackLabel: "Meta Data Deletion Callback URL:",
        }
      : {
          badge: "Hüquq və Məxfilik",
          title: "Məlumatların Silinməsi",
          subtitle: "panelim.az hesabınızın, qoşulmuş Facebook/Instagram/WhatsApp məlumatlarının və Google girişinin silinməsi qaydası.",
          contactCta: "Silinmə sorğusu göndər",
          sections: [
            {
              title: "1. Hansı məlumatlar silinir",
              body: "İstənilən vaxt panelim.az hesab məlumatlarınızın, OAuth bağlantılarınızın (Google/Facebook), iş sahəsindəki kontaktların, müraciətlərin, mesaj tarixçəsinin və qoşulmuş kanal açarlarının birdəfəlik silinməsini tələb edə bilərsiniz.",
            },
            {
              title: "2. Silinmə sorğusu necə göndərilir",
              body: entity.email
                ? `Qeydiyyatdan keçdiyiniz e-poçt ünvanından ${entity.email} ünvanına və ya panelim.az əlaqə forması vasitəsilə «Məlumatların silinməsi» mövzusu ilə müraciət edin. Hesab sahibini təsdiqləmək üçün qeydiyyat e-poçtunuzu və ya telefon nömrənizi qeyd edin.`
                : "panelim.az əlaqə forması vasitəsilə «Məlumatların silinməsi» mövzusu ilə müraciət edin və hesab sahibini təsdiqləmək üçün qeydiyyat e-poçtunuzu və ya telefon nömrənizi qeyd edin.",
            },
            {
              title: "3. Facebook / Instagram icazəsini birbaşa Meta-dan ləğv etmək",
              body: "İstəsəniz icazəni birbaşa Facebook Ayarları -> Tətbiqlər və Veb saytlar -> panelim.az -> Sil bölməsindən ləğv edə bilərsiniz. Meta üzərindən göndərilən sorğular avtomatik Data Deletion Callback ünvanımız tərəfindən qeydə alınır və təsdiq kodu verilir.",
            },
            {
              title: "4. İcra müddəti",
              body: "Təsdiqlənmiş silinmə sorğuları 30 təqvim günü ərzində tam icra olunur. Ehtiyat nüsxələr standart rotasiya dövründə silinir. Azərbaycan Respublikasının vergi qanunvericiliyinə görə saxlanması məcburi olan maliyyə sənədləri yalnız qanuni müddət ərzində qorunur.",
            },
          ],
          callbackLabel: "Meta Data Deletion Callback URL:",
        };

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
        routeSuffix="/legal/data-deletion"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={copy.badge}
          title={copy.title}
          subtitle={copy.subtitle}
          primaryCta={{ href: `/${locale}/contact`, label: copy.contactCta }}
          secondaryCta={{ href: `/${locale}/legal/privacy`, label: s.footer.cols.legal.privacy }}
          image="p-cases"
          imageAlt={copy.title}
          badgeVariant="mint"
        />

        <section className="pm-section">
          <div className="pm-wrap">
            <div className="pm-legal-card">
              <Suspense fallback={null}>
                <DataDeletionStatus lang={locale} />
              </Suspense>
              {copy.sections.map((sec) => (
                <section key={sec.title}>
                  <h2>{sec.title}</h2>
                  <p>{sec.body}</p>
                </section>
              ))}
              <section>
                <p style={{ fontSize: "0.88rem", opacity: 0.85 }}>
                  {copy.callbackLabel} <code>{callbackUrl}</code>
                </p>
              </section>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
                <Link href={`/${locale}/contact`} className="pm-link-arrow">
                  {s.footer.cols.legal.contact}
                </Link>
                <Link href={`/${locale}/legal/privacy`} className="pm-link-arrow">
                  {s.footer.cols.legal.privacy}
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
        routeSuffix="/legal/data-deletion"
      />
    </div>
  );
}
