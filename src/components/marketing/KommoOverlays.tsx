"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { Locale } from "@/app/[lang]/dictionaries";

export type ActiveModal =
  | null
  | "demo"
  | "enterprise"
  | "contact"
  | "partner"
  | "become-partner"
  | "integration"
  | "video";

const COPY = {
  az: {
    announcement: "🔊 panelim.az qiymət və plan dəyişikliklərini nəzərdən keçirin",
    announcementHref: "/az/pricing",
    announcementClose: "Elanı bağla",
    cookieText: "Veb saytımızı işlətmək, təhlil etmək və təkmilləşdirmək üçün kukilər və oxşar texnologiyalardan istifadə edirik.",
    cookieLearnMore: "Ətraflı öyrənin",
    cookieAccept: "Qəbul et",
    stickyCta: "panelim.az AI pulsuz sına",
    fabLabel: "Çoxkanallı canlı dəstək",
    fabTitle: "Bizimlə əlaqə saxlayın",
    fabChannels: [
      { id: "telegram", label: "Telegram", href: "https://t.me/panelim_az" },
      { id: "instagram", label: "Instagram", href: "https://instagram.com/panelim.az" },
      { id: "messenger", label: "Messenger", href: "https://m.me/panelim.az" },
      { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/994501234567" },
    ],
    fabLiveChat: "Canlı Söhbət (Mesaj göndər)",
    fabPartner: "Partner yardımı tələb et",
    fabDemo: "Canlı Demo təyin et",
    fabVideo: "Məhsul videosunu izlə",
    closeModal: "Pəncərəni bağla",
    demoModal: {
      badge: "Calendly · Canlı Görüş",
      title: "15 dəqiqəlik fərdi demo təyin edin",
      subtitle: "Mütəxəssisimizlə uyğun gün və saatı seçin, mərkəziniz üçün canlı iş axınını birlikdə quraq.",
      days: ["B.e · 23 Noy", "Ç.a · 24 Noy", "Çər · 25 Noy", "C.a · 26 Noy"],
      slots: ["11:00", "14:00", "16:30", "18:00"],
      nameLabel: "Adınız",
      phoneLabel: "Telefon nömrəsi",
      submit: "Görüşü təsdiqlə",
      confirmedTitle: "Demo görüşünüz təsdiqləndi!",
      confirmedBody: "Seçdiyiniz vaxt üçün təqvim dəvəti və WhatsApp xatırlatması göndərildi.",
    },
    enterpriseModal: {
      title: "Komandamızla əlaqə saxlayın",
      subtitle: "Korporativ plan: yüksək təhlükəsizlik, fərdi limitlər və xüsusi SLA dəstəyi.",
      nameLabel: "Ad və soyad",
      emailLabel: "E-poçt",
      phoneLabel: "Telefon nömrəsi",
      reasonLabel: "Korporativ plana niyə maraq göstərirsiniz?",
      submit: "Zəng tələbi göndərin",
      successTitle: "Əlaqə saxladığınız üçün təşəkkürlər",
      successBody: "Komandamız panelim.az Korporativ planının biznesinizə necə dəstək ola biləcəyini qiymətləndirmək üçün tezliklə sizinlə əlaqə saxlayacaq.",
      loginBtn: "Giriş",
      registerBtn: "Qeydiyyat",
    },
    contactModal: {
      title: "Bizə Ulaşın",
      messageLabel: "Mesajınız *",
      attachLabel: "Fayl əlavə et",
      emailLabel: "E-poçt *",
      phoneLabel: "Telefon nömrəsi",
      submit: "panelim.az-a mesaj göndər",
      successTitle: "Mesajınız göndərildi!",
      successBody: "Dəstək komandamız ən qısa zamanda e-poçt və WhatsApp vasitəsilə cavab verəcək.",
    },
    partnerModal: {
      step1Title: "Partner yardımı tələb et",
      step2Title: "Son bir addım",
      doneTitle: "İstək göndərildi!",
      doneBody: "Rəsmi inteqrasiya partnerimiz 24 saat ərzində sizinlə əlaqə saxlayacaq.",
      nameLabel: "Tam adınız",
      companyLabel: "Şirkət / Mərkəz adı",
      industryLabel: "Sektor / Sənaye",
      industries: [
        "Təhsil və Kurslar",
        "İdman və Fitnes",
        "Sağlamlıq və Gözəllik",
        "Pərakəndə və E-ticarət",
        "Daşınmaz Əmlak",
        "Rəqəmsal və İT Xidmətləri",
      ],
      helpLabel: "Partnerlərimiz necə kömək edə bilər?",
      emailLabel: "E-poçt",
      phoneLabel: "Telefon nömrəsi",
      nextBtn: "Davam et",
      backBtn: "Geri",
      submitBtn: "Tələbi göndər",
    },
    becomePartnerModal: {
      title: "Rəsmi Partnerimiz Olun",
      subtitle: "panelim.az inteqrasiya və satış tərəfdaşı proqramına qoşulun, 50%-ə qədər komissiya qazanın.",
      nameLabel: "Ad və soyad",
      companyLabel: "Agentlik / Şirkət adı",
      emailLabel: "İş e-poçtu",
      phoneLabel: "Telefon nömrəsi",
      submitBtn: "Partner müraciətini göndər",
      doneTitle: "Partner müraciətiniz qəbul edildi!",
      doneBody: "Tərəfdaşlıq menecerimiz 24 saat ərzində sizinlə əlaqə saxlayacaq.",
    },
    integrationModal: {
      title: "Yeni İnteqrasiya Təklif Edin",
      subtitle: "Hansı kanal, ödəniş sistemi və ya ERP inteqrasiyasını görmək istərdiniz?",
      appNameLabel: "Tətbiq / Xidmət adı",
      useCaseLabel: "İstifadə ssenariniz",
      emailLabel: "E-poçt",
      submitBtn: "Təklifi göndər",
      doneTitle: "Təşəkkürlər!",
      doneBody: "Yeni inteqrasiyalar planlaşdırarkən təklifinizi mütləq nəzərə alacağıq.",
    },
    videoModal: {
      title: "panelim.az — Avtomatlaşdırılmış Satış və AI CRM İcmalı",
      duration: "02:45 · HD Təqdimat",
      chapters: [
        "00:00 — WhatsApp, Instagram və Telegram vahid gələn qutusu",
        "00:55 — AI satış təmsilçisinin 24/7 sınaq dərsi rezervasiyası",
        "01:45 — Kanban satış qıfı, avtomatik tapşırıqlar və analitika",
      ],
      tryCta: "14 gün pulsuz sına",
    },
  },
  en: {
    announcement: "🔊 Review panelim.az pricing and plan updates",
    announcementHref: "/en/pricing",
    announcementClose: "Dismiss announcement",
    cookieText: "We use cookies and similar technologies to operate, analyze, and improve our website.",
    cookieLearnMore: "Learn more",
    cookieAccept: "Accept",
    stickyCta: "Try panelim.az AI free",
    fabLabel: "Multi-channel live support",
    fabTitle: "Connect with us",
    fabChannels: [
      { id: "telegram", label: "Telegram", href: "https://t.me/panelim_az" },
      { id: "instagram", label: "Instagram", href: "https://instagram.com/panelim.az" },
      { id: "messenger", label: "Messenger", href: "https://m.me/panelim.az" },
      { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/994501234567" },
    ],
    fabLiveChat: "Live Chat (Send message)",
    fabPartner: "Request partner assistance",
    fabDemo: "Schedule a live demo",
    fabVideo: "Watch product tour video",
    closeModal: "Close modal",
    demoModal: {
      badge: "Calendly · Live Walkthrough",
      title: "Book a 15-minute tailored demo",
      subtitle: "Pick a day and time slot to see how unified messaging and AI bookings fit your workflow.",
      days: ["Mon · Nov 23", "Tue · Nov 24", "Wed · Nov 25", "Thu · Nov 26"],
      slots: ["11:00", "14:00", "16:30", "18:00"],
      nameLabel: "Your name",
      phoneLabel: "Phone number",
      submit: "Confirm booking",
      confirmedTitle: "Your demo session is confirmed!",
      confirmedBody: "We sent a calendar invite and WhatsApp reminder for your selected slot.",
    },
    enterpriseModal: {
      title: "Contact our enterprise team",
      subtitle: "Enterprise tier: custom security, dedicated limits, and priority SLA onboarding.",
      nameLabel: "Full name",
      emailLabel: "Email",
      phoneLabel: "Phone number",
      reasonLabel: "Why are you interested in the Enterprise plan?",
      submit: "Request a call",
      successTitle: "Thank you for reaching out",
      successBody: "Our team will contact you shortly to evaluate how panelim.az Enterprise can support your organization.",
      loginBtn: "Sign in",
      registerBtn: "Sign up",
    },
    contactModal: {
      title: "Contact Us",
      messageLabel: "Your message *",
      attachLabel: "Attach file",
      emailLabel: "Email *",
      phoneLabel: "Phone number",
      submit: "Send message to panelim.az",
      successTitle: "Message sent!",
      successBody: "Our support team will reply via email and WhatsApp shortly.",
    },
    partnerModal: {
      step1Title: "Request partner assistance",
      step2Title: "One final step",
      doneTitle: "Request submitted!",
      doneBody: "A certified integration partner will reach out to you within 24 hours.",
      nameLabel: "Full name",
      companyLabel: "Company / Center name",
      industryLabel: "Industry",
      industries: [
        "Education & Training",
        "Sports & Fitness",
        "Health & Beauty",
        "Retail & E-commerce",
        "Real Estate",
        "Digital & IT Services",
      ],
      helpLabel: "How can our partners help you?",
      emailLabel: "Email",
      phoneLabel: "Phone number",
      nextBtn: "Continue",
      backBtn: "Back",
      submitBtn: "Submit request",
    },
    becomePartnerModal: {
      title: "Become a Certified Partner",
      subtitle: "Join the panelim.az solution partner program and earn up to 50% recurring commission.",
      nameLabel: "Full name",
      companyLabel: "Agency / Company name",
      emailLabel: "Work email",
      phoneLabel: "Phone number",
      submitBtn: "Submit partner application",
      doneTitle: "Partner application received!",
      doneBody: "Our partner channel manager will contact you within 24 hours.",
    },
    integrationModal: {
      title: "Suggest a New Integration",
      subtitle: "Which messaging channel, payment gateway, or service would you like us to integrate next?",
      appNameLabel: "App / Service name",
      useCaseLabel: "How would you use it?",
      emailLabel: "Email",
      submitBtn: "Submit suggestion",
      doneTitle: "Thank you!",
      doneBody: "We will evaluate your suggestion as we plan upcoming integrations.",
    },
    videoModal: {
      title: "panelim.az — Automated Messaging & AI Sales CRM Tour",
      duration: "02:45 · HD Walkthrough",
      chapters: [
        "00:00 — Unified inbox for WhatsApp, Instagram, and Telegram",
        "00:55 — 24/7 AI booking agent & live seat capacity guard",
        "01:45 — Kanban sales pipeline, automated follow-up tasks & ROI analytics",
      ],
      tryCta: "Start 14-day free trial",
    },
  },
} as const;

const COUNTRY_CODES = [
  { code: "+994", label: "Azerbaijan (Azərbaycan) +994" },
  { code: "+90", label: "Turkey (Türkiye) +90" },
  { code: "+1", label: "United States +1" },
  { code: "+44", label: "United Kingdom +44" },
  { code: "+49", label: "Germany (Deutschland) +49" },
  { code: "+971", label: "United Arab Emirates +971" },
];

export function KommoOverlays({ lang }: { lang: Locale }) {
  const c = COPY[lang];
  const [bannerOpen, setBannerOpen] = useState(true);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Demo modal state
  const [demoDay, setDemoDay] = useState(0);
  const [demoSlot, setDemoSlot] = useState("11:00");
  const [demoName, setDemoName] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [demoConfirmed, setDemoConfirmed] = useState(false);

  // Enterprise modal state
  const [entName, setEntName] = useState("");
  const [entEmail, setEntEmail] = useState("");
  const [entPhone, setEntPhone] = useState("");
  const [entReason, setEntReason] = useState("");
  const [entSent, setEntSent] = useState(false);

  // Contact us modal state
  const [contactMsg, setContactMsg] = useState("");
  const [contactFile, setContactFile] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactCountry, setContactCountry] = useState("+994");
  const [contactPhone, setContactPhone] = useState("");
  const [contactSent, setContactSent] = useState(false);

  // Partner modal state
  const [partnerStep, setPartnerStep] = useState<1 | 2 | 3>(1);
  const [partnerName, setPartnerName] = useState("");
  const [partnerCompany, setPartnerCompany] = useState("");
  const [partnerIndustry, setPartnerIndustry] = useState("");
  const [partnerHelp, setPartnerHelp] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [becomePartnerSent, setBecomePartnerSent] = useState(false);
  const [integrationSent, setIntegrationSent] = useState(false);
  const [integrationApp, setIntegrationApp] = useState("");
  const [integrationNote, setIntegrationNote] = useState("");

  const modalTitleId = useId();

  useEffect(() => {
    try {
      if (!localStorage.getItem("panelim:cookie-accepted")) {
        setCookieOpen(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    function onCustomModal(e: Event) {
      const detail = (e as CustomEvent<{ modal?: ActiveModal }>).detail;
      if (detail?.modal) {
        setActiveModal(detail.modal);
        setFabOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveModal(null);
        setFabOpen(false);
      }
    }
    window.addEventListener("kommo:open-modal", onCustomModal);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("kommo:open-modal", onCustomModal);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function acceptCookies() {
    setCookieOpen(false);
    try {
      localStorage.setItem("panelim:cookie-accepted", "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* 1. Dismissible Top Announcement Strip */}
      {bannerOpen && (
        <div className="pm-kommo-top-strip" role="region" aria-label={c.announcement}>
          <Link href={c.announcementHref} className="pm-kommo-top-strip-link">
            <span>{c.announcement}</span>
          </Link>
          <button
            type="button"
            className="pm-kommo-top-strip-close"
            aria-label={c.announcementClose}
            onClick={() => setBannerOpen(false)}
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Cookie Consent Card (.js-control-cookies-notification) */}
      {cookieOpen && (
        <aside className="pm-kommo-cookie-card" aria-label="Cookies">
          <p className="pm-kommo-cookie-text">
            {c.cookieText}{" "}
            <Link href={`/${lang}/legal/privacy`} className="pm-kommo-cookie-link">
              {c.cookieLearnMore}
            </Link>
          </p>
          <button
            type="button"
            className="pm-kommo-cookie-accept js-control-cookies-close-button"
            onClick={acceptCookies}
          >
            {c.cookieAccept}
          </button>
        </aside>
      )}

      {/* 3. Sticky Bottom CTA Pill (#sticky-cta-button) */}
      <div id="sticky-cta-button" className="pm-kommo-sticky-cta js-sticky-cta-wrapper">
        <Link href={`/${lang}/register`} className="pm-kommo-sticky-cta-btn">
          <span>✨ {c.stickyCta}</span>
        </Link>
      </div>

      {/* 4. Multi-Channel Live Chat & Action Launcher (#amobutton / #amo-livechat) */}
      <div id="amobutton" className="pm-kommo-fab-wrap">
        {fabOpen && (
          <div id="amo-livechat" className="pm-kommo-fab-menu" role="dialog" aria-label={c.fabTitle}>
            <div className="pm-kommo-fab-head">
              <strong>{c.fabTitle}</strong>
              <button type="button" onClick={() => setFabOpen(false)} aria-label={c.closeModal}>
                ×
              </button>
            </div>
            <div className="pm-kommo-flow-art">
              <Image
                src="/images/flow-livechat-launcher.webp"
                alt={c.fabTitle}
                width={260}
                height={145}
                className="pm-kommo-flow-img"
              />
            </div>
            <div className="pm-kommo-fab-list">
              {c.fabChannels.map((ch) => (
                <a
                  key={ch.id}
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pm-kommo-fab-item"
                >
                  <span className="pm-kommo-fab-dot" data-channel={ch.id} />
                  <span>{ch.label}</span>
                </a>
              ))}
              <button
                type="button"
                className="pm-kommo-fab-item is-action"
                onClick={() => {
                  setContactSent(false);
                  setActiveModal("contact");
                  setFabOpen(false);
                }}
              >
                💬 {c.fabLiveChat}
              </button>
              <button
                type="button"
                className="pm-kommo-fab-item is-action"
                onClick={() => {
                  setDemoConfirmed(false);
                  setActiveModal("demo");
                  setFabOpen(false);
                }}
              >
                📅 {c.fabDemo}
              </button>
              <button
                type="button"
                className="pm-kommo-fab-item is-action"
                onClick={() => {
                  setPartnerStep(1);
                  setActiveModal("partner");
                  setFabOpen(false);
                }}
              >
                🤝 {c.fabPartner}
              </button>
              <button
                type="button"
                className="pm-kommo-fab-item is-action"
                onClick={() => {
                  setActiveModal("video");
                  setFabOpen(false);
                }}
              >
                ▶️ {c.fabVideo}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className="pm-kommo-fab-trigger js-amo-button"
          aria-expanded={fabOpen}
          aria-label={c.fabLabel}
          onClick={() => setFabOpen((v) => !v)}
        >
          {fabOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* 5. Modals (Calendly Demo, Enterprise Request, Contact Us, Find Partner, Video Lightbox) */}
      {activeModal && (
        <div
          className="pm-kommo-modal-backdrop js-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div className="pm-kommo-modal-card">
            <button
              type="button"
              className="pm-kommo-modal-close js-modal-close-button"
              aria-label={c.closeModal}
              onClick={() => setActiveModal(null)}
            >
              ×
            </button>

            {activeModal === "demo" && (
              <div id="calendly-widget" className="pm-kommo-modal-body">
                <div className="pm-kommo-flow-art">
                  <Image
                    src={
                      lang === "en"
                        ? "/images/flow-calendar-booking-en.webp"
                        : "/images/flow-calendar-booking.webp"
                    }
                    alt={c.demoModal.title}
                    width={460}
                    height={256}
                    className="pm-kommo-flow-img"
                  />
                </div>
                <span className="pm-tag">{c.demoModal.badge}</span>
                <h2 id={modalTitleId}>{c.demoModal.title}</h2>
                <p className="pm-kommo-modal-sub">{c.demoModal.subtitle}</p>

                {demoConfirmed ? (
                  <div className="pm-kommo-modal-success" role="status">
                    <h3>✓ {c.demoModal.confirmedTitle}</h3>
                    <p>{c.demoModal.confirmedBody}</p>
                    <p className="pm-kommo-slot-summary">
                      <strong>{c.demoModal.days[demoDay]}</strong> · <strong>{demoSlot}</strong>
                    </p>
                  </div>
                ) : (
                  <form
                    className="pm-kommo-modal-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setDemoConfirmed(true);
                    }}
                  >
                    <div className="pm-kommo-chip-row">
                      {c.demoModal.days.map((day, idx) => (
                        <button
                          key={day}
                          type="button"
                          className={demoDay === idx ? "pm-kommo-chip is-active" : "pm-kommo-chip"}
                          onClick={() => setDemoDay(idx)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className="pm-kommo-chip-row">
                      {c.demoModal.slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={demoSlot === slot ? "pm-kommo-chip is-active" : "pm-kommo-chip"}
                          onClick={() => setDemoSlot(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    <label className="pm-kommo-field">
                      <span>{c.demoModal.nameLabel}</span>
                      <input
                        type="text"
                        required
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.demoModal.phoneLabel}</span>
                      <input
                        type="tel"
                        required
                        value={demoPhone}
                        onChange={(e) => setDemoPhone(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="pm-btn pm-btn-primary pm-btn-block">
                      {c.demoModal.submit}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeModal === "enterprise" && (
              <div id="enterprise-request" className="pm-kommo-modal-body js-enterprise-request-modal">
                {entSent ? (
                  <div className="pm-kommo-modal-success js-enterprise-request-success" role="status">
                    <h2 id={modalTitleId}>{c.enterpriseModal.successTitle}</h2>
                    <p>{c.enterpriseModal.successBody}</p>
                    <div className="pm-kommo-modal-actions">
                      <Link href={`/${lang}/login`} className="pm-btn pm-btn-outline">
                        {c.enterpriseModal.loginBtn}
                      </Link>
                      <Link href={`/${lang}/register`} className="pm-btn pm-btn-primary">
                        {c.enterpriseModal.registerBtn}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form
                    className="pm-kommo-modal-form js-enterprise-request-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setEntSent(true);
                    }}
                  >
                    <h2 id={modalTitleId}>{c.enterpriseModal.title}</h2>
                    <p className="pm-kommo-modal-sub">{c.enterpriseModal.subtitle}</p>
                    <label className="pm-kommo-field">
                      <span>{c.enterpriseModal.nameLabel}</span>
                      <input
                        type="text"
                        name="name"
                        required
                        value={entName}
                        onChange={(e) => setEntName(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.enterpriseModal.emailLabel}</span>
                      <input
                        type="email"
                        name="email"
                        required
                        value={entEmail}
                        onChange={(e) => setEntEmail(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.enterpriseModal.phoneLabel}</span>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={entPhone}
                        onChange={(e) => setEntPhone(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>
                        {c.enterpriseModal.reasonLabel} ({entReason.length} / 1024)
                      </span>
                      <textarea
                        rows={3}
                        maxLength={1024}
                        required
                        value={entReason}
                        onChange={(e) => setEntReason(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="pm-btn pm-btn-primary pm-btn-block">
                      {c.enterpriseModal.submit}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeModal === "contact" && (
              <div className="pm-kommo-modal-body js-contact-us-modal">
                {contactSent ? (
                  <div className="pm-kommo-modal-success" role="status">
                    <h2 id={modalTitleId}>✓ {c.contactModal.successTitle}</h2>
                    <p>{c.contactModal.successBody}</p>
                  </div>
                ) : (
                  <form
                    className="pm-kommo-modal-form js-contact-us-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setContactSent(true);
                    }}
                  >
                    <h2 id={modalTitleId}>{c.contactModal.title}</h2>
                    <label className="pm-kommo-field">
                      <span>
                        {c.contactModal.messageLabel} ({contactMsg.length} / 1024)
                      </span>
                      <textarea
                        rows={3}
                        maxLength={1024}
                        required
                        value={contactMsg}
                        onChange={(e) => setContactMsg(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.contactModal.attachLabel}</span>
                      <input
                        type="file"
                        onChange={(e) => setContactFile(e.target.files?.[0]?.name ?? null)}
                      />
                      {contactFile && <small>{contactFile}</small>}
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.contactModal.emailLabel}</span>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </label>
                    <div className="pm-kommo-phone-row">
                      <label className="pm-kommo-field">
                        <span>{c.contactModal.phoneLabel}</span>
                        <div className="pm-kommo-phone-split">
                          <select
                            value={contactCountry}
                            onChange={(e) => setContactCountry(e.target.value)}
                            aria-label="Country code"
                          >
                            {COUNTRY_CODES.map((cc) => (
                              <option key={cc.code} value={cc.code}>
                                {cc.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            placeholder="50 123 45 67"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                          />
                        </div>
                      </label>
                    </div>
                    <button type="submit" className="pm-btn pm-btn-primary pm-btn-block">
                      {c.contactModal.submit}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeModal === "partner" && (
              <div className="pm-kommo-modal-body js-find-partner">
                {partnerStep === 1 && (
                  <form
                    className="pm-kommo-modal-form js-find-partner-form-step-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPartnerStep(2);
                    }}
                  >
                    <h2 id={modalTitleId}>{c.partnerModal.step1Title}</h2>
                    <label className="pm-kommo-field">
                      <span>{c.partnerModal.nameLabel}</span>
                      <input
                        type="text"
                        required
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.partnerModal.companyLabel}</span>
                      <input
                        type="text"
                        required
                        value={partnerCompany}
                        onChange={(e) => setPartnerCompany(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.partnerModal.industryLabel}</span>
                      <select
                        value={partnerIndustry}
                        onChange={(e) => setPartnerIndustry(e.target.value)}
                      >
                        {c.partnerModal.industries.map((ind) => (
                          <option key={ind} value={ind}>
                            {ind}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.partnerModal.helpLabel}</span>
                      <textarea
                        rows={3}
                        required
                        value={partnerHelp}
                        onChange={(e) => setPartnerHelp(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="pm-btn pm-btn-primary pm-btn-block">
                      {c.partnerModal.nextBtn}
                    </button>
                  </form>
                )}

                {partnerStep === 2 && (
                  <form
                    className="pm-kommo-modal-form js-find-partner-form-step-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPartnerStep(3);
                    }}
                  >
                    <h2 id={modalTitleId}>{c.partnerModal.step2Title}</h2>
                    <label className="pm-kommo-field">
                      <span>{c.partnerModal.emailLabel}</span>
                      <input
                        type="email"
                        required
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.partnerModal.phoneLabel}</span>
                      <input
                        type="tel"
                        required
                        value={partnerPhone}
                        onChange={(e) => setPartnerPhone(e.target.value)}
                      />
                    </label>
                    <div className="pm-kommo-modal-actions">
                      <button
                        type="button"
                        className="pm-btn pm-btn-outline"
                        onClick={() => setPartnerStep(1)}
                      >
                        {c.partnerModal.backBtn}
                      </button>
                      <button type="submit" className="pm-btn pm-btn-primary">
                        {c.partnerModal.submitBtn}
                      </button>
                    </div>
                  </form>
                )}

                {partnerStep === 3 && (
                  <div className="pm-kommo-modal-success" role="status">
                    <h2 id={modalTitleId}>✓ {c.partnerModal.doneTitle}</h2>
                    <p>{c.partnerModal.doneBody}</p>
                  </div>
                )}
              </div>
            )}

            {activeModal === "become-partner" && (
              <div className="pm-kommo-modal-body js-sign-up-partner">
                {becomePartnerSent ? (
                  <div className="pm-kommo-modal-success" role="status">
                    <h2 id={modalTitleId}>✓ {c.becomePartnerModal.doneTitle}</h2>
                    <p>{c.becomePartnerModal.doneBody}</p>
                  </div>
                ) : (
                  <form
                    className="pm-kommo-modal-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setBecomePartnerSent(true);
                    }}
                  >
                    <h2 id={modalTitleId}>{c.becomePartnerModal.title}</h2>
                    <p className="pm-kommo-modal-sub">{c.becomePartnerModal.subtitle}</p>
                    <label className="pm-kommo-field">
                      <span>{c.becomePartnerModal.nameLabel}</span>
                      <input type="text" required />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.becomePartnerModal.companyLabel}</span>
                      <input type="text" required />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.becomePartnerModal.emailLabel}</span>
                      <input type="email" required />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.becomePartnerModal.phoneLabel}</span>
                      <input type="tel" required />
                    </label>
                    <button type="submit" className="pm-btn pm-btn-primary pm-btn-block">
                      {c.becomePartnerModal.submitBtn}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeModal === "integration" && (
              <div className="pm-kommo-modal-body js-integration-request-success-modal">
                {integrationSent ? (
                  <div className="pm-kommo-modal-success" role="status">
                    <h2 id={modalTitleId}>✓ {c.integrationModal.doneTitle}</h2>
                    <p>{c.integrationModal.doneBody}</p>
                  </div>
                ) : (
                  <form
                    className="pm-kommo-modal-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setIntegrationSent(true);
                    }}
                  >
                    <h2 id={modalTitleId}>{c.integrationModal.title}</h2>
                    <p className="pm-kommo-modal-sub">{c.integrationModal.subtitle}</p>
                    <label className="pm-kommo-field">
                      <span>{c.integrationModal.appNameLabel}</span>
                      <input
                        type="text"
                        required
                        value={integrationApp}
                        onChange={(e) => setIntegrationApp(e.target.value)}
                      />
                    </label>
                    <label className="pm-kommo-field">
                      <span>{c.integrationModal.useCaseLabel}</span>
                      <textarea
                        rows={3}
                        required
                        value={integrationNote}
                        onChange={(e) => setIntegrationNote(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="pm-btn pm-btn-primary pm-btn-block">
                      {c.integrationModal.submitBtn}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeModal === "video" && (
              <div id="marquee-video-modal" className="pm-kommo-modal-body js-video-modal">
                <span className="pm-tag">{c.videoModal.duration}</span>
                <h2 id={modalTitleId}>{c.videoModal.title}</h2>
                <div className="pm-kommo-flow-art">
                  <Image
                    src={
                      lang === "en"
                        ? "/images/flow-copilot-analytics-en.webp"
                        : "/images/flow-copilot-analytics.webp"
                    }
                    alt={c.videoModal.title}
                    width={460}
                    height={256}
                    className="pm-kommo-flow-img"
                  />
                </div>
                <div className="pm-kommo-video-stage">
                  <ul className="pm-kommo-video-chapters">
                    {c.videoModal.chapters.map((ch) => (
                      <li key={ch}>▶ {ch}</li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/${lang}/register`}
                  className="pm-btn pm-btn-primary pm-btn-block"
                  onClick={() => setActiveModal(null)}
                >
                  {c.videoModal.tryCta}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
