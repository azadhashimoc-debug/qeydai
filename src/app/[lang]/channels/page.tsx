import type { Metadata } from "next";
import { WhatsAppIcon } from "@/components/ChannelIcons";
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

function PaniIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
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
    title: locale === "en" ? "WhatsApp and Pani AI" : "WhatsApp və Pani AI",
    description: locale === "en" ? "Manage customer conversations with WhatsApp and the Pani AI assistant." : "WhatsApp və Pani AI köməkçisi ilə müştəri mesajlarını idarə edin.",
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
          title={locale === "en" ? "WhatsApp and Pani AI" : "WhatsApp və Pani AI"}
          subtitle={locale === "en" ? "Manage customer conversations with WhatsApp and the Pani AI assistant." : "WhatsApp və Pani AI köməkçisi ilə müştəri mesajlarını idarə edin."}
          primaryCta={{ href: `/${locale}/channels/whatsapp`, label: "WhatsApp" }}
          secondaryCta={{ href: `/${locale}/demo`, label: c.hero.secondaryCta }}
          image="p-channels"
          imageAlt={locale === "en" ? "WhatsApp and Pani AI" : "WhatsApp və Pani AI"}
        />

        <FeatureGrid
          columns={2}
          items={[
            {
              title: c.cards.whatsapp.title,
              desc: locale === "en" ? "Connect one WhatsApp account and manage customer conversations." : "Bir WhatsApp hesabını qoşun və müştəri mesajlarını idarə edin.",
              href: `/${locale}/channels/whatsapp`,
              ctaLabel: s.navGroups.channels.whatsappTitle,
              tone: "mint",
              icon: <WhatsAppIcon size={24} />,
            },
            {
              title: "Pani AI",
              desc: locale === "en" ? "AI assistant for customer conversations and daily work." : "Müştəri mesajları və gündəlik iş üçün süni intellekt köməkçisi.",
              href: `/${locale}/ai`,
              ctaLabel: locale === "en" ? "Explore Pani AI" : "Pani AI ilə tanış ol",
              tone: "lavender",
              icon: <PaniIcon />,
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
        routeSuffix="/channels"
      />
    </div>
  );
}
