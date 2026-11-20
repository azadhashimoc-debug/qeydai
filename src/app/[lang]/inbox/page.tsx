import type { Metadata } from "next";
import { InboxShowcaseClient } from "@/components/marketing/InboxShowcaseClient";
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

export async function generateMetadata({ params }: PageProps<"/[lang]/inbox">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/inbox",
    title: d.subpages.inbox.hero.title,
    description: d.subpages.inbox.hero.subtitle,
    brand: d.brand,
    image: "/images/p-inbox.webp",
  });
}

export default async function InboxPage({ params }: PageProps<"/[lang]/inbox">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const i = s.inbox;
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
        routeSuffix="/inbox"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={i.hero.badge}
          title={i.hero.title}
          subtitle={i.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: i.hero.primaryCta }}
          secondaryCta={{ href: `/${locale}/ai`, label: i.hero.secondaryCta }}
          image="p-inbox"
          imageAlt={i.hero.title}
          badgeVariant="mint"
        />

        <section className="pm-section pm-pipe-intro-band">
          <div className="pm-wrap pm-pipe-intro">
            <h2>{isEn ? "Meet the Unified Inbox" : "Gələn qutusu ilə tanış olun"}</h2>
            <p>
              {isEn ? (
                <>
                  Our{" "}
                  <mark className="pm-hl is-amber">unified inbox</mark>{" "}
                  gathers all student chats in{" "}
                  <mark className="pm-hl is-lav">one workspace</mark>,{" "}
                  builds a complete profile, and helps teams{" "}
                  <mark className="pm-hl is-sky">collaborate seamlessly</mark>.
                </>
              ) : (
                <>
                  <mark className="pm-hl is-amber">Vahid gələn qutusu</mark>{" "}
                  bütün söhbətlərinizi{" "}
                  <mark className="pm-hl is-lav">tək bir tətbiqdə</mark>{" "}
                  toplayır, hər tələbə üçün profil yaradır və komandanızın{" "}
                  <mark className="pm-hl is-sky">asanlıqla əməkdaşlıq</mark>{" "}
                  etməsini təmin edir.
                </>
              )}
            </p>
          </div>
        </section>

        <InboxShowcaseClient lang={locale} />

        <FeatureGrid
          heading={isEn ? "More tools" : "Daha çox alət"}
          columns={2}
          items={[
            {
              title: s.navGroups.product.pipelineTitle,
              desc: i.features.items.two.desc,
              href: `/${locale}/pipeline`,
              ctaLabel: s.navGroups.product.pipelineTitle,
              tone: "lavender",
            },
            {
              title: s.navGroups.product.aiTitle,
              desc: i.features.items.four.desc,
              href: `/${locale}/ai`,
              ctaLabel: s.navGroups.product.aiTitle,
              tone: "mint",
            },
          ]}
        />

        <BottomCtaBand
          title={s.common.bottomCta.title}
          subtitle={s.common.bottomCta.subtitle}
          primaryHref={`/${locale}/demo`}
          primaryLabel={s.common.bottomCta.primary}
          secondaryHref={`/${locale}/login`}
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
        routeSuffix="/inbox"
      />
    </div>
  );
}
