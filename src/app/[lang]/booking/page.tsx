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

export async function generateMetadata({ params }: PageProps<"/[lang]/booking">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/booking",
    title: d.subpages.booking.hero.title,
    description: d.subpages.booking.hero.subtitle,
    brand: d.brand,
    image: "/images/p-booking.webp",
  });
}

export default async function BookingPage({ params }: PageProps<"/[lang]/booking">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const b = s.booking;
  const isEn = locale === "en";

  const tabs: ShowcaseTab[] = isEn
    ? [
        {
          id: "calendar",
          label: "Lock appointment slots on the calendar",
          caption: "Customers see available time slots and reserve bookings without double-booking.",
          previewTitle: "BOOKING CONFIRMED",
          previewBadge: "1 slot left",
          rows: [
            { title: "Initial Consultation", meta: "Thu 16:00 · Branch 1", badge: "Confirmed", tone: "mint" },
            { title: "Service Visit", meta: "Fri 18:30 · Room 2", badge: "2/8 slots", tone: "sky" },
          ],
        },
        {
          id: "reminders",
          label: "Trigger automated reminders",
          caption: "Send WhatsApp or Telegram reminders 2 hours before the appointment automatically.",
          previewTitle: "REMINDERS",
          previewBadge: "Auto",
          rows: [
            { title: "WhatsApp Ping", meta: "2h before visit · Baku address", badge: "Sent", tone: "mint" },
            { title: "Duplicate Guard", meta: "Blocks repeat +994 booking", badge: "Protected", tone: "amber" },
          ],
        },
        {
          id: "instructors",
          label: "Assign tasks to specialists",
          caption: "Notify staff members when a new customer books their time slot.",
          previewTitle: "TEAM SYNC",
          previewBadge: "Instant",
          rows: [
            { title: "Specialist Leyla", meta: "New 16:00 booking confirmed", badge: "Notified", tone: "sky" },
            { title: "Front Desk", meta: "Schedule roster updated", badge: "Synced", tone: "mint" },
          ],
        },
      ]
    : [
        {
          id: "calendar",
          label: "Görüş yerlərini təqvimdə kilidləyin",
          caption: "Müştərilər yalnız boş olan saatlara yazılır və cədvəl tutumu avtomatik qorunur.",
          previewTitle: "GÖRÜŞ TƏSDİQLƏNDİ",
          previewBadge: "1 yer qaldı",
          rows: [
            { title: "İlkin Konsultasiya", meta: "C.a 16:00 · Filial 1", badge: "Təsdiqləndi", tone: "mint" },
            { title: "Xidmət Qəbulu", meta: "Cümə 18:30 · Otaq 2", badge: "2/8 yer", tone: "sky" },
          ],
        },
        {
          id: "reminders",
          label: "Avtomatik xatırlatmaları işə salın",
          caption: "Görüşdən 2 saat əvvəl WhatsApp və Telegram üzərindən ünvan və saat xatırlatması göndərin.",
          previewTitle: "XATIRLATMALAR",
          previewBadge: "Avto",
          rows: [
            { title: "WhatsApp Bildirişi", meta: "Görüşdən 2 saat əvvəl", badge: "Göndərildi", tone: "mint" },
            { title: "Təkrar Qeyd Qoruması", meta: "Eyni +994 nömrə bloklanır", badge: "Qorunur", tone: "amber" },
          ],
        },
        {
          id: "instructors",
          label: "Mütəxəssislərə tapşırıq təyin edin",
          caption: "Yeni müştəri qeydiyyatdan keçən kimi məsul əməkdaşa və administratora bildiriş getsin.",
          previewTitle: "KOMANDA SİNXRONU",
          previewBadge: "Ani",
          rows: [
            { title: "Mütəxəssis Leyla", meta: "Saat 16:00 üçün yeni görüş", badge: "Bildirildi", tone: "sky" },
            { title: "Qeydiyyat Masası", meta: "Günün cədvəli yeniləndi", badge: "Hazır", tone: "mint" },
          ],
        },
      ];

  const sectorCards = isEn
    ? [
        { title: "For Beauty & Clinics", desc: "Let clients pick open specialist slots directly inside WhatsApp or Instagram.", tone: "sky" as const },
        { title: "For Fitness Studios", desc: "Manage group workouts, trainer schedules, and intro session bookings.", href: `/${locale}/scenarios/fitness-centers`, ctaLabel: "Explore fitness scenario", tone: "mint" as const },
        { title: "For Service & Retail", desc: "Schedule consultations, showroom visits, and delivery windows without overlaps.", tone: "amber" as const },
        { title: "For Courses & Training", desc: "Organize group schedules, seat capacity, and attendance confirmations.", href: `/${locale}/industries/education`, ctaLabel: "Explore education CRM", tone: "lavender" as const },
      ]
    : [
        { title: "Gözəllik və klinikalar üçün", desc: "Müştərilər WhatsApp və Instagram-dan birbaşa boş saat seçib randevu alsınlar.", tone: "sky" as const },
        { title: "Fitness salonları üçün", desc: "Qrup məşqlərini, məşqçi cədvəllərini və sınaq məşqlərini avtomatlaşdırın.", href: `/${locale}/scenarios/fitness-centers`, ctaLabel: "Fitness ssenarisinə bax", tone: "mint" as const },
        { title: "Xidmət və satış biznesləri üçün", desc: "Konsultasiya, ofis ziyarəti və çatdırılma saatlarını toqquşmasız planlayın.", tone: "amber" as const },
        { title: "Kurs və təlimlər üçün", desc: "Qrup cədvəllərini, yer tutumunu və iştirak təsdiqlərini səhvsiz idarə edin.", href: `/${locale}/industries/education`, ctaLabel: "Təhsil CRM-inə bax", tone: "lavender" as const },
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
        routeSuffix="/booking"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={b.hero.badge}
          title={b.hero.title}
          subtitle={b.hero.subtitle}
          primaryCta={{ href: `/${locale}/demo`, label: b.hero.primaryCta }}
          secondaryCta={{ href: `/${locale}/scenarios/fitness-centers`, label: b.hero.secondaryCta }}
          image="p-booking"
          imageAlt={b.hero.title}
        />

        <KommoTabbedShowcase
          heading={isEn ? "Your team's booking solution" : "Komandanızın görüş və rezervasiya həlli"}
          subheading={
            isEn
              ? "Combine chat, capacity locks, and automated reminders to turn every inquiry into a confirmed visit."
              : "Söhbət, tutum kilidi və avtomatik xatırlatmaları birləşdirib hər müraciəti real görüşə çevirin."
          }
          tabs={tabs}
        />

        <KommoPromoBand
          title={
            isEn
              ? "Get the most out of AI-assisted appointment scheduling"
              : "Süni intellekt alətlərindən maksimum yararlanın"
          }
          ctaHref={`/${locale}/demo`}
          ctaLabel={isEn ? "Try 14 days free" : "14 gün pulsuz sına"}
          tone="amber"
        />

        <FeatureAlternating
          rows={[
            {
              tag: s.navGroups.product.aiTitle,
              title: b.features.items.three.title,
              body: b.features.items.three.desc,
              cta: { href: `/${locale}/ai`, label: s.navGroups.product.aiTitle },
              image: "p-ai-copilot",
              imageAlt: b.features.items.three.title,
              tone: "lavender",
            },
          ]}
        />

        <FeatureGrid
          heading={isEn ? "Built for your center" : "Biznesiniz üçün xüsusi dizayn"}
          columns={2}
          items={sectorCards}
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
        routeSuffix="/booking"
      />
    </div>
  );
}
