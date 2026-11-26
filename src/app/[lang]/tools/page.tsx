import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import {
  BottomCtaBand,
  FeatureAlternating,
  SubpageHero,
} from "@/components/marketing/SubpageBlocks";
import { WhatsAppToolsClient } from "@/components/marketing/WhatsAppToolsClient";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/tools">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/tools",
    title: d.subpages.tools.hero.title,
    description: d.subpages.tools.hero.subtitle,
    brand: d.brand,
    image: "/images/p-tools.webp",
  });
}

export default async function ToolsPage({ params }: PageProps<"/[lang]/tools">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;

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
        routeSuffix="/tools"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={s.tools.hero.badge}
          title={s.tools.hero.title}
          subtitle={s.tools.hero.subtitle}
          secondaryCta={{ href: `/${locale}/channels/whatsapp`, label: s.common.exploreProduct }}
          image="p-tools"
          imageAlt={s.tools.hero.title}
          badgeVariant="mint"
        />

        <section id="tools-workbench" className="pm-section">
          <div className="pm-wrap">
            <WhatsAppToolsClient copy={s.tools} />
          </div>
        </section>

        <FeatureAlternating
          rows={
            locale === "en"
              ? [
                  {
                    tag: "Entry Point",
                    title: "Turn attention into a direct chat entry point",
                    body: "Place your custom wa.me link or QR code on Instagram bio, flyers, and service landing pages so customers start chatting in one tap.",
                    image: "p-whatsapp",
                    imageAlt: "WhatsApp link",
                    tone: "mint",
                  },
                  {
                    tag: "AI Speed",
                    title: "Let AI answer every message instantly",
                    body: "Connect your link to panelim.az so incoming inquiries receive service details and appointment booking options 24/7.",
                    image: "p-ai-copilot",
                    imageAlt: "AI replies",
                    tone: "lavender",
                  },
                ]
              : [
                  {
                    tag: "Giriş Nöqtəsi",
                    title: "Marağı birbaşa WhatsApp söhbətinə çevirin",
                    body: "Xüsusi wa.me linkini və ya QR kodunu Instagram bio-da, elanlarda və veb səhifənizdə yerləşdirin ki, müştərilər bir toxunuşla yazsınlar.",
                    image: "p-whatsapp",
                    imageAlt: "WhatsApp linki",
                    tone: "mint",
                  },
                  {
                    tag: "AI Sürəti",
                    title: "AI hər mesajı anında cavablasın",
                    body: "Linkdən gələn müraciətləri panelim.az-a bağlayın ki, xidmət cədvəli və boş saat məlumatı 24/7 avtomatik göndərilsin.",
                    image: "p-ai-copilot",
                    imageAlt: "AI cavablar",
                    tone: "lavender",
                  },
                ]
          }
        />

        <section className="pm-section">
          <div className="pm-wrap pm-faq-inner">
            <div className="pm-section-head">
              <h2>{locale === "en" ? "Frequently Asked Questions" : "Tez-tez verilən suallar"}</h2>
            </div>
            <div className="pm-faq-list">
              {(locale === "en"
                ? [
                    {
                      q: "Is creating a WhatsApp link and QR code free?",
                      a: "Yes. Both the custom wa.me link builder and SVG/PNG QR generator are 100% free with no account required.",
                    },
                    {
                      q: "Why use a pre-filled welcome message?",
                      a: "Pre-filled messages help your team immediately see which service or ad campaign the customer clicked from.",
                    },
                  ]
                : [
                    {
                      q: "WhatsApp linki və QR kodu yaratmaq pulsuzdur?",
                      a: "Bəli. Həm fərdi wa.me link generatoru, həm də QR kod yükləyicisi qeydiyyatsız və tam pulsuzdur.",
                    },
                    {
                      q: "Niyə hazır salamlama mesajı əlavə etmək lazımdır?",
                      a: "Hazır mesaj sayəsində müştəri yazan kimi hansı xidmət və ya reklam üzrə müraciət etdiyini dərhal görürsünüz.",
                    },
                  ]
              ).map((item) => (
                <details key={item.q} className="pm-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <BottomCtaBand
          title={s.common.bottomCta.title}
          subtitle={s.common.bottomCta.subtitle}
          primaryHref={`/${locale}/demo`}
          primaryLabel={s.common.bottomCta.primary}
          secondaryHref={`/${locale}/pricing`}
          secondaryLabel={s.common.bottomCta.secondary}
        />
      </main>

      <SiteFooter
        lang={locale}
        other={other}
        tagline={d.landing.footer.tagline}
        copyright={d.landing.footer.copyright}
        switchLabel={d.landing.footer.switchLabel}
        cols={s.footer}
        routeSuffix="/tools"
      />
    </div>
  );
}
