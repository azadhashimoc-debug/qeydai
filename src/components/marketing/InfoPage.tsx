import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, FeatureAlternating, FeatureGrid, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { PAGES, type PageKey } from "@/app/[lang]/dictionaries/pages";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";

const tones = ["lavender", "mint", "sky"] as const;

export async function infoMetadata(lang: string, key: PageKey) {
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const page = PAGES[key];
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: `/${key}`,
    title: page[locale].title,
    description: page[locale].subtitle,
    brand: d.brand,
    image: `/images/${page.image}.webp`,
  });
}

export async function InfoPage({ lang, pageKey }: { lang: string; pageKey: PageKey }) {
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const page = PAGES[pageKey];
  const c = page[locale];
  const routeSuffix = `/${pageKey}`;

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
        routeSuffix={routeSuffix}
      />
      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={c.badge}
          title={c.title}
          subtitle={c.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bottomCta.primary }}
          secondaryCta={{ href: `/${locale}/pricing`, label: s.common.bottomCta.secondary }}
          image={page.image}
          imageAlt={c.title}
          badgeVariant={page.badgeVariant}
        />
        <FeatureGrid
          heading={c.heading}
          columns={3}
          items={c.items.map((item, i) => ({ ...item, tone: tones[i % tones.length] }))}
        />
        <FeatureAlternating
          rows={[
            {
              title: c.row.title,
              body: c.row.body,
              bullets: [...c.row.bullets],
              image: page.rowImage,
              imageAlt: c.row.title,
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
        routeSuffix={routeSuffix}
      />
    </div>
  );
}
