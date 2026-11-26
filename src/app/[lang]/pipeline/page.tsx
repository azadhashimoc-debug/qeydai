import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { PipelineFocusClient } from "@/components/marketing/PipelineFocusClient";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import {
  BottomCtaBand,
  FeatureGrid,
  SubpageHero,
} from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/pipeline">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/pipeline",
    title: d.subpages.pipeline.hero.title,
    description: d.subpages.pipeline.hero.subtitle,
    brand: d.brand,
    image: "/images/p-pipeline.webp",
  });
}

export default async function PipelinePage({ params }: PageProps<"/[lang]/pipeline">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const p = s.pipeline;
  const isEn = locale === "en";

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
        routeSuffix="/pipeline"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={p.hero.badge}
          title={p.hero.title}
          subtitle={p.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: p.hero.primaryCta }}
          secondaryCta={{ href: `/${locale}/demo`, label: p.hero.secondaryCta }}
          image="p-pipeline"
          imageAlt={p.hero.title}
        />

        <section className="pm-section pm-pipe-intro-band">
          <div className="pm-wrap pm-pipe-intro">
            <h2>{isEn ? "Meet the Pipeline" : "Pipeline ilə tanış olun"}</h2>
            <p>
              {isEn ? (
                <>
                  A{" "}
                  <mark className="pm-hl is-amber">visual sales funnel</mark>{" "}
                  built to{" "}
                  <mark className="pm-hl is-lav">organize customer inquiries</mark>{" "}
                  and move every lead smoothly{" "}
                  <mark className="pm-hl is-sky">toward a closed sale</mark>.
                </>
              ) : (
                <>
                  Müraciətləri{" "}
                  <mark className="pm-hl is-amber">sistemli izləmək</mark>,{" "}
                  <mark className="pm-hl is-lav">görüşləri idarə etmək</mark>{" "}
                  və müştəriləri{" "}
                  <mark className="pm-hl is-sky">ödənişli satışa çatdırmaq</mark>{" "}
                  üçün qurulmuş vizual satış xətti.
                </>
              )}
            </p>
          </div>
        </section>

        <PipelineFocusClient lang={locale} />

        <section className="pm-section">
          <div className="pm-wrap">
            <div className="pm-prod-ai-banner">
              <div className="pm-prod-ai-copy">
                <span className="pm-prod-ai-tag">✨ AI CRM</span>
                <h2>
                  {isEn ? "AI-powered conversations" : "Süni intellekt dəstəklı söhbət"}
                </h2>
                <p>
                  {isEn
                    ? "Draft clear replies, summarize chat history, and suggest the next stage automatically inside every deal."
                    : "Söhbət tarixçəsini saniyələr içində xülasə edin, cavab qaralama təklifləri alın və növbəti mərhələni avtomatik təyin edin."}
                </p>
                <Link href={`/${locale}/ai`} className="pm-prod-ai-link">
                  {s.navGroups.product.aiTitle} →
                </Link>
              </div>
              <div className="pm-prod-ai-media">
                <Photo
                  name="p-ai-copilot"
                  alt={s.navGroups.product.aiTitle}
                  className="pm-prod-ai-img"
                />
              </div>
            </div>
          </div>
        </section>

        <FeatureGrid
          heading={isEn ? "More tools you'll love" : "Sevəcəyiniz daha çox alət"}
          columns={2}
          items={[
            {
              title: s.navGroups.product.inboxTitle,
              desc: p.features.items.two.desc,
              href: `/${locale}/inbox`,
              ctaLabel: s.navGroups.product.inboxTitle,
              tone: "lavender",
            },
            {
              title: s.navGroups.product.bookingTitle,
              desc: p.features.items.four.desc,
              href: `/${locale}/booking`,
              ctaLabel: s.navGroups.product.bookingTitle,
              tone: "mint",
            },
          ]}
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
        routeSuffix="/pipeline"
      />
    </div>
  );
}
