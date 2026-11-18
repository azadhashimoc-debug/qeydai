import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, SubpageHero } from "@/components/marketing/SubpageBlocks";
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
          primaryCta={{ href: "#tools-workbench", label: s.tools.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/channels/whatsapp`, label: s.tools.hero.ctaSecondary }}
          image="p-tools"
          imageAlt={s.tools.hero.title}
          badgeVariant="mint"
        />

        <section id="tools-workbench" className="pm-section">
          <div className="pm-wrap">
            <WhatsAppToolsClient copy={s.tools} />
          </div>
        </section>

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
        routeSuffix="/tools"
      />
    </div>
  );
}
