import type { Metadata } from "next";
import { KommoTabbedShowcase, type ShowcaseTab } from "@/components/marketing/KommoTabbedShowcase";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import {
  BottomCtaBand,
  FeatureAlternating,
  FeatureGrid,
  KommoPromoBand,
  SubpageHero,
} from "@/components/marketing/SubpageBlocks";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/scenarios/fitness-centers">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/scenarios/fitness-centers",
    title: d.subpages.fitnessScenario.hero.title,
    description: d.subpages.fitnessScenario.hero.subtitle,
    brand: d.brand,
    image: "/images/p-fitness.webp",
  });
}

export default async function FitnessScenarioPage({
  params,
}: PageProps<"/[lang]/scenarios/fitness-centers">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const f = s.fitnessScenario;
  const steps = f.workflow.steps;
  const isEn = locale === "en";

  const fitnessTabs: ShowcaseTab[] = isEn
    ? [
        {
          id: "sales",
          label: "For marketing & sales teams",
          caption: "Track which Instagram or WhatsApp ad campaign drives real gym trial passes and monthly memberships.",
          previewTitle: "AD ATTRIBUTION",
          previewBadge: "AZN ROI",
          rows: [
            { title: "Summer Promo", meta: "42 trial passes booked", badge: "Instagram", tone: "amber" },
            { title: "Baku Pilates", meta: "18 monthly memberships", badge: "WhatsApp", tone: "mint" },
          ],
        },
        {
          id: "reception",
          label: "For reception & front desk",
          caption: "Answer membership fee questions and book trial workouts in one unified inbox.",
          previewTitle: "FRONT DESK",
          previewBadge: "Live",
          rows: [
            { title: "Nigar A.", meta: "Pilates trial · 19:00", badge: "Checked in", tone: "mint" },
            { title: "Rashad M.", meta: "CrossFit intro · Tomorrow", badge: "Confirmed", tone: "sky" },
          ],
        },
        {
          id: "trainers",
          label: "For trainers & instructors",
          caption: "Keep trainer calendars synced with zero double-booked personal training sessions.",
          previewTitle: "TRAINER SCHEDULE",
          previewBadge: "Synced",
          rows: [
            { title: "Coach Orkhan", meta: "10:00 – 14:00 · 4 sessions", badge: "Full", tone: "amber" },
            { title: "Coach Sabina", meta: "17:00 – 20:00 · 2 slots left", badge: "Open", tone: "mint" },
          ],
        },
      ]
    : [
        {
          id: "sales",
          label: "Marketinq və satış komandaları üçün",
          caption: "Hansı Instagram və ya WhatsApp reklamının real sınaq girişi və aylıq abunə gətirdiyini izləyin.",
          previewTitle: "REKLAM ANALİTİKASI",
          previewBadge: "AZN Gəlir",
          rows: [
            { title: "Yay Kampaniyası", meta: "42 sınaq dərsi yazıldı", badge: "Instagram", tone: "amber" },
            { title: "Bakı Pilates", meta: "18 aylıq abunə", badge: "WhatsApp", tone: "mint" },
          ],
        },
        {
          id: "reception",
          label: "Resepşn və qarşılama heyəti üçün",
          caption: "Qiymət suallarını cavablayın və sınaq məşqlərini vahid gələn qutusundan təsdiqləyin.",
          previewTitle: "QARŞILAMA MASASI",
          previewBadge: "Canlı",
          rows: [
            { title: "Nigar A.", meta: "Pilates sınaq · 19:00", badge: "Gəldi", tone: "mint" },
            { title: "Rəşad M.", meta: "CrossFit giriş · Sabah", badge: "Təsdiqləndi", tone: "sky" },
          ],
        },
        {
          id: "trainers",
          label: "Məşqçilər və təlimçilər üçün",
          caption: "Hər məşqçinin saatlarını sinxron saxlayın və fərdi məşq toqquşmalarının qarşısını alın.",
          previewTitle: "MƏŞQÇİ CƏDVƏLİ",
          previewBadge: "Sinxron",
          rows: [
            { title: "Məşqçi Orxan", meta: "10:00 – 14:00 · 4 məşq", badge: "Dolu", tone: "amber" },
            { title: "Məşqçi Səbinə", meta: "17:00 – 20:00 · 2 boş yer", badge: "Açıq", tone: "mint" },
          ],
        },
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
        routeSuffix="/scenarios/fitness-centers"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={f.badge}
          title={f.hero.title}
          subtitle={f.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: f.hero.primaryCta }}
          secondaryCta={{ href: `/${locale}/pricing`, label: f.hero.secondaryCta }}
          image="p-fitness"
          imageAlt={f.hero.title}
          badgeVariant="amber"
        />

        <KommoTabbedShowcase
          heading={
            isEn
              ? "Manage your fitness studio with panelim.az"
              : "Fitness salonunuzu panelim.az ilə idarə edin"
          }
          subheading={
            isEn
              ? "From capturing Instagram leads to locking trial workouts and tracking renewals in one place."
              : "Müraciət cəlb etməkdən tutmuş sınaq məşqi rezervasiyasına və üzvlük yeniləməsinə qədər tək platforma."
          }
          tabs={fitnessTabs}
        />

        <KommoPromoBand
          title={
            isEn
              ? "More members joining? Upgrade to Pro"
              : "Daha çox üzv gəlir? Pro planına keçin"
          }
          ctaHref={`/${locale}/pricing`}
          ctaLabel={isEn ? "Compare plans" : "Planlara bax"}
          tone="sky"
        />

        <FeatureGrid
          heading={f.workflow.title}
          columns={3}
          items={[
            {
              title: steps.step1.title,
              desc: steps.step1.desc,
              tone: "lavender",
            },
            {
              title: steps.step2.title,
              desc: steps.step2.desc,
              tone: "mint",
            },
            {
              title: steps.step3.title,
              desc: steps.step3.desc,
              tone: "sky",
            },
          ]}
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.common.badgeSample,
              title: f.workflow.title,
              body: f.hero.disclaimer,
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-booking",
              imageAlt: f.workflow.title,
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
        routeSuffix="/scenarios/fitness-centers"
      />
    </div>
  );
}
