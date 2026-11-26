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
          label: "Lock booked slots on the calendar",
          caption: "Customers see available time slots and book without overbooking.",
          previewTitle: "TRIAL CONFIRMED",
          previewBadge: "1 seat left",
          rows: [
            { title: "Consultation", meta: "Thu 16:00 · Room 3", badge: "Confirmed", tone: "mint" },
            { title: "General English B1", meta: "Fri 18:30 · Room 1", badge: "2/8 seats", tone: "sky" },
          ],
        },
        {
          id: "reminders",
          label: "Trigger automated reminders",
          caption: "Send WhatsApp or Telegram reminders 2 hours before the appointment automatically.",
          previewTitle: "REMINDERS",
          previewBadge: "Auto",
          rows: [
            { title: "WhatsApp Ping", meta: "2h before class · Baku address", badge: "Sent", tone: "mint" },
            { title: "Duplicate Guard", meta: "Blocks repeat +994 booking", badge: "Protected", tone: "amber" },
          ],
        },
        {
          id: "instructors",
          label: "Assign tasks to instructors",
          caption: "Notify the specialist when a new customer books their slot.",
          previewTitle: "TEAM SYNC",
          previewBadge: "Instant",
          rows: [
            { title: "Specialist Leyla", meta: "New booking added", badge: "Notified", tone: "sky" },
            { title: "Admin Desk", meta: "Attendance check ready", badge: "Synced", tone: "mint" },
          ],
        },
      ]
    : [
        {
          id: "calendar",
          label: "Rezerv olunmuş vaxtları təqvimdə kilidləyin",
          caption: "Müştərilər yalnız boş vaxtlara yazılır və tutum avtomatik qorunur.",
          previewTitle: "SINAQ TƏSDİQLƏNDİ",
          previewBadge: "1 yer qaldı",
          rows: [
            { title: "Konsultasiya", meta: "C.a 16:00 · Otaq 3", badge: "Təsdiqləndi", tone: "mint" },
            { title: "Ümumi İngilis B1", meta: "Cümə 18:30 · Otaq 1", badge: "2/8 yer", tone: "sky" },
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
          label: "Müəllimlərə tapşırıq təyin edin",
          caption: "Yeni rezervasiya olunan kimi mütəxəssisə və koordinatora bildiriş getsin.",
          previewTitle: "KOMANDA SİNXRONU",
          previewBadge: "Ani",
          rows: [
            { title: "Mütəxəssis Leyla", meta: "Yeni rezervasiya", badge: "Bildirildi", tone: "sky" },
            { title: "Qeydiyyat Masası", meta: "Davamiyyət siyahısı hazırdır", badge: "Hazır", tone: "mint" },
          ],
        },
      ];

  const sectorCards = isEn
    ? [
        { title: "For Education Centers", desc: "Automate IELTS, SAT, IT, and language trial lessons with zero double-bookings.", tone: "lavender" as const },
        { title: "For Fitness Studios", desc: "Manage group workouts, trainer schedules, and trial pass renewals.", href: `/${locale}/scenarios/fitness-centers`, ctaLabel: "Explore fitness scenario", tone: "mint" as const },
        { title: "For Beauty & Clinics", desc: "Let clients pick open specialist slots directly inside WhatsApp or Instagram.", tone: "sky" as const },
        { title: "For Workshops & Clubs", desc: "Track seat limits, attendance confirmations, and post-event follow-ups.", tone: "amber" as const },
      ]
    : [
        { title: "Tədris mərkəzləri üçün", desc: "IELTS, SAT, proqramlaşdırma və dil kurslarının sınaq dərslərini səhvsiz planlayın.", tone: "lavender" as const },
        { title: "Fitness salonları üçün", desc: "Qrup məşqlərini, məşqçi cədvəllərini və sınaq girişlərini avtomatlaşdırın.", href: `/${locale}/scenarios/fitness-centers`, ctaLabel: "Fitness ssenarisinə bax", tone: "mint" as const },
        { title: "Gözəllik və klinikalar üçün", desc: "Müştərilər WhatsApp və Instagram-dan birbaşa boş saat seçib randevu alsınlar.", tone: "sky" as const },
        { title: "Təlim və klublar üçün", desc: "Maksimum yer limitinə nəzarət edin, iştirak təsdiqlərini avtomatik toplayın.", tone: "amber" as const },
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
          heading={isEn ? "Your team's booking solution" : "Komandanızın rezervasiya həlli"}
          subheading={
            isEn
              ? "Combine chat, capacity locks, and automated reminders to turn every inquiry into attendance."
              : "Söhbət, yer sayı kilidi və avtomatik xatırlatmaları birləşdirib hər müraciəti real görüşə çevirin."
          }
          tabs={tabs}
        />

        <KommoPromoBand
          title={
            isEn
              ? "Get the most out of AI-assisted scheduling"
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
