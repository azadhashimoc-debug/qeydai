import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { ProductViewSwitcherClient } from "@/components/marketing/ProductViewSwitcherClient";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import {
  BottomCtaBand,
  FeatureAlternating,
  FeatureGrid,
  SubpageHero,
} from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/product">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/product",
    title: d.subpages.product.hero.title,
    description: d.subpages.product.hero.subtitle,
    brand: d.brand,
    image: "/images/p-product-tour.webp",
  });
}

export default async function ProductPage({ params }: PageProps<"/[lang]/product">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const p = s.product;
  const isEn = locale === "en";

  const extraTools = isEn
    ? [
        { title: "Tasks", desc: "Set follow-up reminders directly on customer profiles and keep operators aligned.", tone: "lavender" as const },
        { title: "Team chat", desc: "Discuss inquiries internally inside each lead card without leaving the inbox.", tone: "mint" as const },
        { title: "Analytics", desc: "Monitor sales conversion rates, response speed, and revenue in AZN.", tone: "sky" as const },
        { title: "Web forms", desc: "Embed fast lead capture forms directly into your center's website.", tone: "lavender" as const },
        { title: "Chat widget", desc: "Connect WhatsApp, Instagram, and Telegram into one multi-channel widget.", tone: "mint" as const },
        { title: "Integrations", desc: "Automate enrollments with n8n webhooks, Google Sheets, and Meta Cloud API.", tone: "sky" as const },
      ]
    : [
        { title: "Tapşırıqlar", desc: "Müştəri kartlarına xatırlatmalar əlavə edin və operator təqvimini idarə edin.", tone: "lavender" as const },
        { title: "Komanda söhbəti", desc: "Müraciət kartının daxilində komanda yoldaşlarınıza qeyd və bildiriş göndərin.", tone: "mint" as const },
        { title: "Analitika", desc: "Satış nəticələrini, cavab sürətini və AZN gəlirini canlı izləyin.", tone: "sky" as const },
        { title: "Veb formalar", desc: "Potensial müştəriləri birbaşa satış lövhəsinə yönləndirən formalar yaradın.", tone: "lavender" as const },
        { title: "Çat düyməsi", desc: "Saytınıza WhatsApp, Instagram və Telegram-ı birləşdirən düymə əlavə edin.", tone: "mint" as const },
        { title: "İnteqrasiyalar", desc: "n8n, Google Sheets və rəsmi Meta Cloud API ilə iş axınını avtomatlaşdırın.", tone: "sky" as const },
      ];

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
        routeSuffix="/product"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={p.hero.badge}
          title={p.hero.title}
          subtitle={p.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: p.hero.primaryCta }}
          secondaryCta={{ href: `/${locale}/channels`, label: p.hero.secondaryCta }}
          image="p-product-tour"
          imageAlt={p.hero.title}
        />

        <ProductViewSwitcherClient lang={locale} />

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.product.pipelineTitle,
              title: p.modules.pipeline.title,
              body: p.modules.pipeline.desc,
              cta: { href: `/${locale}/pipeline`, label: s.navGroups.product.pipelineTitle },
              image: "p-pipeline",
              imageAlt: p.modules.pipeline.title,
              tone: "mint",
            },
            {
              tag: s.navGroups.product.inboxTitle,
              title: p.modules.inbox.title,
              body: p.modules.inbox.desc,
              cta: { href: `/${locale}/inbox`, label: s.navGroups.product.inboxTitle },
              image: "p-inbox",
              imageAlt: p.modules.inbox.title,
              tone: "lavender",
            },
            {
              tag: s.navGroups.product.bookingTitle,
              title: p.modules.booking.title,
              body: p.modules.booking.desc,
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-booking",
              imageAlt: p.modules.booking.title,
              tone: "sky",
            },
          ]}
        />

        <section className="pm-section">
          <div className="pm-wrap">
            <div className="pm-prod-ai-banner">
              <div className="pm-prod-ai-copy">
                <span className="pm-prod-ai-tag">✨ AI CRM</span>
                <h2>{p.modules.ai.title}</h2>
                <p>{p.modules.ai.desc}</p>
                <Link href={`/${locale}/ai`} className="pm-prod-ai-link">
                  {s.navGroups.product.aiTitle} →
                </Link>
              </div>
              <div className="pm-prod-ai-media">
                <Photo
                  name="p-ai-copilot"
                  alt={p.modules.ai.title}
                  className="pm-prod-ai-img"
                />
              </div>
            </div>
          </div>
        </section>

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.product.aiTitle,
              title: isEn ? "No-code Salesbot & Automation" : "Kodsuz Salesbot və Avtomatlaşdırma",
              body: isEn
                ? "Greet students 24/7, answer fee questions in Azerbaijani, and lock trial lesson seats automatically."
                : "Tələbələri 24/7 qarşılayın, qiymət və cədvəl suallarını Azərbaycan dilində cavablandırın, boş yerləri avtomatik kilidləyin.",
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-salesbot",
              imageAlt: "Salesbot",
              tone: "lavender",
            },
          ]}
        />

        <FeatureGrid
          heading={isEn ? "There's even more" : "Daha çox imkan var"}
          columns={3}
          items={extraTools}
        />

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
        routeSuffix="/product"
      />
    </div>
  );
}
