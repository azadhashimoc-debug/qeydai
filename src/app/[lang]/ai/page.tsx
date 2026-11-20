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
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/ai">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/ai",
    title: d.subpages.ai.hero.title,
    description: d.subpages.ai.hero.subtitle,
    brand: d.brand,
    image: "/images/p-ai-copilot.webp",
  });
}

export default async function AiPage({ params }: PageProps<"/[lang]/ai">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const ai = s.ai;
  const isEn = locale === "en";

  const tabs: ShowcaseTab[] = isEn
    ? [
        {
          id: "summarize",
          label: "Save time with AI summaries",
          caption: "Instant bullet-point recap of every WhatsApp and Instagram thread before you reply.",
          previewTitle: "AI SUMMARY",
          previewBadge: "2s",
          rows: [
            { title: "Intent", meta: "IELTS Speaking · Evening", badge: "High", tone: "mint" },
            { title: "Budget", meta: "180 AZN / month", badge: "Matched", tone: "sky" },
            { title: "Next step", meta: "Confirm Thursday 18:30", badge: "Ready", tone: "amber" },
          ],
        },
        {
          id: "tone",
          label: "Polish your reply tone",
          caption: "Turn quick operator notes into warm, polite Azerbaijani or English responses.",
          previewTitle: "AI REPLY DRAFT",
          previewBadge: "1-click",
          rows: [
            { title: "Draft", meta: "\"Salam! Sabah saat 16:00 qrupunda yer var\"", badge: "Polite", tone: "mint" },
            { title: "Location", meta: "Nizami metro · 3rd floor", badge: "Added", tone: "sky" },
          ],
        },
        {
          id: "tasks",
          label: "Stay organized with AI tasks",
          caption: "Automatically schedule follow-ups when a parent or student asks to decide later.",
          previewTitle: "AUTO FOLLOW-UP",
          previewBadge: "Scheduled",
          rows: [
            { title: "Reminder", meta: "Follow up with Kamran A.", badge: "Tomorrow 11:00", tone: "amber" },
            { title: "Handoff", meta: "Escalate payment question to admin", badge: "Alert", tone: "sky" },
          ],
        },
      ]
    : [
        {
          id: "summarize",
          label: "AI xülasələri ilə vaxt qazanın",
          caption: "Cavab yazmazdan əvvəl WhatsApp və Instagram yazışmalarının qısa xülasəsini dərhal görün.",
          previewTitle: "AI XÜLASƏ",
          previewBadge: "2 san",
          rows: [
            { title: "Məqsəd", meta: "IELTS Danışıq · Axşam qrupu", badge: "Dəqiq", tone: "mint" },
            { title: "Tarif", meta: "180 AZN / ay", badge: "Uyğun", tone: "sky" },
            { title: "Növbəti addım", meta: "Cümə axşamı 18:30 təsdiqi", badge: "Hazır", tone: "amber" },
          ],
        },
        {
          id: "tone",
          label: "AI ilə tonu mükəmməlləşdirin",
          caption: "Qısa operator qeydini bir kliklə səmimi və peşəkar Azərbaycan dili cavabına çevirin.",
          previewTitle: "AI CAVAB QARALAMASI",
          previewBadge: "1-klik",
          rows: [
            { title: "Cavab", meta: "\"Salam! Sabah saat 16:00 qrupunda 2 yer var\"", badge: "Səmimi", tone: "mint" },
            { title: "Ünvan", meta: "Nizami m/st · 3-cü mərtəbə", badge: "Əlavə olundu", tone: "sky" },
          ],
        },
        {
          id: "tasks",
          label: "AI tapşırıqları ilə nizamlı qalın",
          caption: "Valideyn və ya tələbə \"sabah yazacam\" dedikdə sistem avtomatik xatırlatma yaradır.",
          previewTitle: "AVTO TƏQİB",
          previewBadge: "Planlandı",
          rows: [
            { title: "Xatırlatma", meta: "Kamran Ə. ilə əlaqə saxla", badge: "Sabah 11:00", tone: "amber" },
            { title: "Ötürmə", meta: "Ödəniş sualını koordinatora yönləndir", badge: "Canlı", tone: "sky" },
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
        routeSuffix="/ai"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={ai.hero.badge}
          title={ai.hero.title}
          subtitle={ai.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: ai.hero.primaryCta }}
          secondaryCta={{ href: `/${locale}/booking`, label: ai.hero.secondaryCta }}
          image="p-ai-copilot"
          imageAlt={ai.hero.title}
          badgeVariant="amber"
        />

        <KommoTabbedShowcase
          heading={isEn ? "Leave routine work to AI CRM" : "Rutin işləri AI CRM-ə buraxın"}
          subheading={
            isEn
              ? "Automate repetitive replies and let your coordinators focus on enrolling students."
              : "Təkrarlanan sualları avtomatlaşdırın ki, koordinatorlarınız əsas satışa və tələbələrə fokuslansın."
          }
          tabs={tabs}
        />

        <KommoPromoBand
          title={
            isEn
              ? "Have an AI assistant serving your center 24/7"
              : "AI CRM ilə 7/24 xidmət verən köməkçiniz olsun"
          }
          ctaHref={`/${locale}/demo`}
          ctaLabel={isEn ? "Try 14 days free" : "14 gün pulsuz sına"}
          tone="lavender"
        />

        <FeatureAlternating
          rows={[
            {
              tag: "AI Agent",
              title: ai.scenarios.greeting.title,
              body: ai.scenarios.greeting.desc,
              cta: { href: `/${locale}/booking`, label: s.navGroups.product.bookingTitle },
              image: "p-salesbot",
              imageAlt: ai.scenarios.greeting.title,
              tone: "lavender",
            },
            {
              tag: "Copilot",
              title: ai.scenarios.handoff.title,
              body: ai.scenarios.handoff.desc,
              cta: { href: `/${locale}/inbox`, label: s.navGroups.product.inboxTitle },
              image: "p-inbox",
              imageAlt: ai.scenarios.handoff.title,
              tone: "mint",
            },
          ]}
        />

        <FeatureGrid
          heading={ai.scenariosTitle}
          subheading={ai.scenariosSubtitle}
          columns={3}
          items={[
            { title: ai.scenarios.greeting.title, desc: ai.scenarios.greeting.desc, tone: "lavender" },
            { title: ai.scenarios.pricing.title, desc: ai.scenarios.pricing.desc, tone: "mint" },
            { title: ai.scenarios.booking.title, desc: ai.scenarios.booking.desc, tone: "sky" },
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
        routeSuffix="/ai"
      />
    </div>
  );
}
