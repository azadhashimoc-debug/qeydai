import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import {
  BottomCtaBand,
  FeatureAlternating,
  FeatureGrid,
  SubpageHero,
} from "@/components/marketing/SubpageBlocks";
import { CHANNEL_SLUGS, type ChannelSlug, isChannelSlug } from "@/lib/marketing/catalog";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

const CHANNEL_IMAGES: Record<ChannelSlug, string> = {
  whatsapp: "p-whatsapp",
  instagram: "p-instagram",
  telegram: "p-telegram",
  "webhook-api": "p-salesbot",
};

export function generateStaticParams() {
  return locales.flatMap((lang) => CHANNEL_SLUGS.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/channels/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isChannelSlug(slug)) notFound();
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const detail = d.subpages.channelDetails[slug];
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: `/channels/${slug}`,
    title: detail.title,
    description: detail.subtitle,
    brand: d.brand,
    image: `/images/${CHANNEL_IMAGES[slug]}.webp`,
  });
}

export default async function ChannelDetailPage({
  params,
}: PageProps<"/[lang]/channels/[slug]">) {
  const { lang, slug } = await params;
  if (!isChannelSlug(slug)) notFound();

  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const detail = s.channelDetails[slug];
  const image = CHANNEL_IMAGES[slug];

  const secondaryCta =
    slug === "whatsapp"
      ? { href: `/${locale}/tools`, label: s.navGroups.channels.toolsTitle }
      : { href: `/${locale}/channels`, label: s.common.backToChannels };

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
        routeSuffix={`/channels/${slug}`}
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={detail.badge}
          title={detail.title}
          subtitle={detail.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bookDemo }}
          secondaryCta={secondaryCta}
          image={image}
          imageAlt={detail.title}
          badgeVariant={slug === "whatsapp" ? "mint" : "default"}
        />

        <FeatureGrid
          columns={2}
          items={[
            { title: detail.features.one, desc: detail.subtitle, tone: "mint" },
            { title: detail.features.two, desc: detail.subtitle, tone: "lavender" },
            { title: detail.features.three, desc: detail.subtitle, tone: "sky" },
            {
              title: detail.features.four,
              desc: detail.subtitle,
              tone: "amber",
              ...(slug === "whatsapp"
                ? { href: `/${locale}/tools`, ctaLabel: s.navGroups.channels.toolsTitle }
                : {}),
            },
          ]}
        />

        {slug === "webhook-api" && (
          <section className="pm-section">
            <div className="pm-wrap">
              <div className="pm-tools-card">
                <div className="pm-tools-split">
                  <div>
                    <h3>REST &amp; n8n Endpoints</h3>
                    <p className="pm-subhero-sub">{detail.subtitle}</p>
                  </div>
                  <pre className="pm-code-box" translate="no">
{`GET  /api/v1/sessions
POST /api/v1/enroll
GET  /api/v1/leads
POST /api/v1/messages
Authorization: Bearer <QEYDAI_API_KEY>`}
                  </pre>
                </div>
              </div>
            </div>
          </section>
        )}

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.product.inboxTitle,
              title: s.inbox.hero.title,
              body: s.inbox.hero.subtitle,
              cta: { href: `/${locale}/inbox`, label: s.navGroups.product.inboxTitle },
              image: "p-inbox",
              imageAlt: s.inbox.hero.title,
              tone: "sky",
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
        routeSuffix={`/channels/${slug}`}
      />
    </div>
  );
}
