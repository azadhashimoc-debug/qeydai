import type { Metadata } from "next";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/ChannelIcons";
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

function WebhookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13.5 7l-3 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/channels">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/channels",
    title: d.subpages.channelsHub.hero.title,
    description: d.subpages.channelsHub.hero.subtitle,
    brand: d.brand,
    image: "/images/p-channels.webp",
  });
}

export default async function ChannelsHubPage({ params }: PageProps<"/[lang]/channels">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const c = s.channelsHub;

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
        routeSuffix="/channels"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={c.hero.badge}
          title={c.hero.title}
          subtitle={c.hero.subtitle}
          primaryCta={{ href: `/${locale}/tools`, label: c.hero.primaryCta }}
          secondaryCta={{ href: `/${locale}/channels/whatsapp`, label: c.hero.secondaryCta }}
          image="p-channels"
          imageAlt={c.hero.title}
        />

        <FeatureGrid
          columns={2}
          items={[
            {
              title: c.cards.whatsapp.title,
              desc: c.cards.whatsapp.desc,
              href: `/${locale}/channels/whatsapp`,
              ctaLabel: s.navGroups.channels.whatsappTitle,
              tone: "mint",
              icon: <WhatsAppIcon size={24} />,
            },
            {
              title: c.cards.instagram.title,
              desc: c.cards.instagram.desc,
              href: `/${locale}/channels/instagram`,
              ctaLabel: s.navGroups.channels.instagramTitle,
              tone: "lavender",
              icon: <InstagramIcon size={24} />,
            },
            {
              title: c.cards.telegram.title,
              desc: c.cards.telegram.desc,
              href: `/${locale}/channels/telegram`,
              ctaLabel: s.navGroups.channels.telegramTitle,
              tone: "sky",
              icon: <TelegramIcon size={24} />,
            },
            {
              title: c.cards.webhookApi.title,
              desc: c.cards.webhookApi.desc,
              href: `/${locale}/channels/webhook-api`,
              ctaLabel: s.navGroups.channels.apiTitle,
              tone: "amber",
              icon: <WebhookIcon />,
            },
          ]}
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.channels.toolsTitle,
              title: s.tools.hero.title,
              body: s.tools.hero.subtitle,
              cta: { href: `/${locale}/tools`, label: s.navGroups.channels.toolsTitle },
              image: "p-tools",
              imageAlt: s.tools.hero.title,
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
        routeSuffix="/channels"
      />
    </div>
  );
}
