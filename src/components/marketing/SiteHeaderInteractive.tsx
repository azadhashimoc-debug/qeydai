"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type HeaderDropdownItem = {
  href: string;
  title: string;
  desc?: string;
};

export type HeaderDropdownGroup = {
  id: string;
  label: string;
  items: HeaderDropdownItem[];
};

const MEGA_COPY = {
  az: {
    sectorsHeading: "Sahələr üzrə həllər",
    whatsNewBadge: "YENİ · Yay '26 Buraxılışı",
    whatsNewTitle: "AI Təmsilçilər və Canlı Tutum Qoruyucusu",
    whatsNewBtn: "▶ Məhsul videosunu izlə",
    partnerBadge: "RƏSMİ TƏRƏFDAŞLAR",
    partnerTitle: "Quraşdırma və inteqrasiya üçün partner dəstəyi",
    partnerBtn: "🤝 Partner yardımı tələb et",
    becomePartnerBtn: "🚀 Partnerimiz olun (%50 komissiya)",
    suggestIntegrationBtn: "🔌 Yeni inteqrasiya təklif et",
    demoBtn: "📅 15 dəq canlı demo təyin et",
    sectors: [
      {
        id: "education",
        name: "Təhsil və Kurslar",
        subs: ["Dil və İmtahan Mərkəzləri", "İdman və Rəqs Akademiyaları", "Uşaq İnkişaf Mərkəzləri"],
        storyTitle: "Bakı Tədris Mərkəzi sınaq dərsi qeydiyyatını 3.2x artırdı",
        storyHref: "/az/scenarios/fitness-centers",
      },
      {
        id: "fitness",
        name: "İdman və Fitnes",
        subs: ["Fitnes Klubları", "Pilates və Yoqa Studiyaları", "Üzgüçülük Kompleksləri"],
        storyTitle: "Qrup məşqlərində yer doluluğu 94%-ə çatdırıldı",
        storyHref: "/az/scenarios/fitness-centers",
      },
      {
        id: "beauty",
        name: "Sağlamlıq və Gözəllik",
        subs: ["Estetik Klinikalar", "Stomatologiya", "Gözəllik Salonları və SPA"],
        storyTitle: "WhatsApp və Instagram-dan avtomatik növbə rezervasiyası",
        storyHref: "/az/booking",
      },
      {
        id: "retail",
        name: "Pərakəndə və E-ticarət",
        subs: ["Instagram Mağazaları", "Geyim və Aksesuar", "Elektronika Satışı"],
        storyTitle: "Mesajdan sifarişə 45 saniyədə avtomatik keçid",
        storyHref: "/az/channels/instagram",
      },
      {
        id: "realestate",
        name: "Daşınmaz Əmlak",
        subs: ["Tikinti Şirkətləri", "Əmlak Agentlikləri", "Kommersiya İcarəsi"],
        storyTitle: "Baxış görüşlərinin AI ilə avtomatik təqvimi",
        storyHref: "/az/pipeline",
      },
      {
        id: "it",
        name: "Rəqəmsal və İT",
        subs: ["Marketinq Agentlikləri", "SaaS və B2B Xidmətlər", "Konsaltinq"],
        storyTitle: "Webhook və REST API ilə tam avtomatlaşdırılmış qıf",
        storyHref: "/az/channels/webhook-api",
      },
    ],
  },
  en: {
    sectorsHeading: "Solutions by industry",
    whatsNewBadge: "NEW · Summer '26 Release",
    whatsNewTitle: "AI Agents & Live Seat Capacity Guard",
    whatsNewBtn: "▶ Watch product tour video",
    partnerBadge: "CERTIFIED PARTNERS",
    partnerTitle: "Turnkey setup & integration with a certified partner",
    partnerBtn: "🤝 Request partner assistance",
    becomePartnerBtn: "🚀 Become a partner (50% commission)",
    suggestIntegrationBtn: "🔌 Suggest a new integration",
    demoBtn: "📅 Book a 15-min live demo",
    sectors: [
      {
        id: "education",
        name: "Education & Training",
        subs: ["Language & Exam Prep Centers", "Sports & Dance Academies", "Kids Learning Studios"],
        storyTitle: "Baku Learning Center boosted trial class bookings by 3.2x",
        storyHref: "/en/scenarios/fitness-centers",
      },
      {
        id: "fitness",
        name: "Sports & Fitness",
        subs: ["Fitness Clubs", "Pilates & Yoga Studios", "Swimming Complexes"],
        storyTitle: "Group class seat occupancy reached 94% with zero overbooking",
        storyHref: "/en/scenarios/fitness-centers",
      },
      {
        id: "beauty",
        name: "Health & Beauty",
        subs: ["Aesthetic Clinics", "Dental Practices", "Beauty Salons & Spas"],
        storyTitle: "Automated appointment scheduling from WhatsApp & Instagram",
        storyHref: "/en/booking",
      },
      {
        id: "retail",
        name: "Retail & E-commerce",
        subs: ["Instagram Boutiques", "Apparel & Accessories", "Electronics Retail"],
        storyTitle: "DM-to-checkout conversion in under 45 seconds",
        storyHref: "/en/channels/instagram",
      },
      {
        id: "realestate",
        name: "Real Estate",
        subs: ["Property Developers", "Brokerage Agencies", "Commercial Leasing"],
        storyTitle: "Automated property viewing calendar powered by AI",
        storyHref: "/en/pipeline",
      },
      {
        id: "it",
        name: "Digital & IT",
        subs: ["Marketing Agencies", "SaaS & B2B Services", "Consulting Firms"],
        storyTitle: "Full-funnel automation via Webhook & REST API",
        storyHref: "/en/channels/webhook-api",
      },
    ],
  },
} as const;

export function NavDropdown({
  group,
  lang = "az",
}: {
  group: HeaderDropdownGroup;
  lang?: "az" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [sectorIdx, setSectorIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const mega = MEGA_COPY[lang];
  const activeSector = mega.sectors[sectorIdx] ?? mega.sectors[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openGlobalModal(
    modal: "video" | "partner" | "become-partner" | "integration" | "demo",
  ) {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kommo:open-modal", { detail: { modal } }));
    }
  }

  const isMegaProduct = group.id === "product";
  const isMegaChannels = group.id === "channels";
  const isMegaResources = group.id === "resources";

  return (
    <div
      ref={rootRef}
      className={open ? "pm-dropdown is-open" : "pm-dropdown"}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="pm-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{group.label}</span>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className={
            isMegaProduct
              ? "pm-dropdown-panel pm-dropdown-panel--mega"
              : isMegaResources
                ? "pm-dropdown-panel pm-dropdown-panel--wide"
                : "pm-dropdown-panel"
          }
          role="menu"
        >
          <div className="pm-mega-col">
            {group.items.map((item) => (
              <Link
                key={item.href + item.title}
                href={item.href}
                role="menuitem"
                className="pm-dropdown-item"
                onClick={() => setOpen(false)}
              >
                <strong>{item.title}</strong>
                {item.desc && <span>{item.desc}</span>}
              </Link>
            ))}
          </div>

          {isMegaProduct && (
            <div className="pm-mega-sectors">
              <p className="pm-mega-eyebrow">{mega.sectorsHeading}</p>
              <div className="pm-mega-sectors-split">
                <div className="pm-mega-sector-tabs">
                  {mega.sectors.map((sec, idx) => (
                    <button
                      key={sec.id}
                      type="button"
                      className={
                        idx === sectorIdx
                          ? "pm-mega-sector-btn is-active"
                          : "pm-mega-sector-btn"
                      }
                      onMouseEnter={() => setSectorIdx(idx)}
                      onClick={() => setSectorIdx(idx)}
                    >
                      {sec.name}
                    </button>
                  ))}
                </div>
                <div className="pm-mega-sector-detail">
                  <ul className="pm-mega-sublist">
                    {activeSector.subs.map((sub) => (
                      <li key={sub}>• {sub}</li>
                    ))}
                  </ul>
                  <Link
                    href={activeSector.storyHref}
                    className="pm-mega-story-card"
                    onClick={() => setOpen(false)}
                  >
                    <strong>{activeSector.storyTitle} →</strong>
                  </Link>
                  <div className="pm-mega-spotlight">
                    <span className="pm-mega-badge">{mega.whatsNewBadge}</span>
                    <strong>{mega.whatsNewTitle}</strong>
                    <button
                      type="button"
                      className="pm-mega-action-btn"
                      onClick={() => openGlobalModal("video")}
                    >
                      {mega.whatsNewBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isMegaChannels && (
            <button
              type="button"
              className="pm-mega-action-btn is-secondary"
              style={{ marginTop: 8 }}
              onClick={() => openGlobalModal("integration")}
            >
              {mega.suggestIntegrationBtn}
            </button>
          )}

          {isMegaResources && (
            <div className="pm-mega-partner-box">
              <span className="pm-mega-badge">{mega.partnerBadge}</span>
              <strong>{mega.partnerTitle}</strong>
              <button
                type="button"
                className="pm-mega-action-btn"
                onClick={() => openGlobalModal("partner")}
              >
                {mega.partnerBtn}
              </button>
              <button
                type="button"
                className="pm-mega-action-btn is-secondary"
                onClick={() => openGlobalModal("become-partner")}
              >
                {mega.becomePartnerBtn}
              </button>
              <button
                type="button"
                className="pm-mega-action-btn is-secondary"
                onClick={() => openGlobalModal("demo")}
              >
                {mega.demoBtn}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HeaderMobileMenu({
  groups,
  directLinks,
  loginLabel,
  loginHref,
  registerLabel,
  registerHref,
  demoLabel,
  demoHref,
  menuOpenLabel,
  menuCloseLabel,
}: {
  groups: HeaderDropdownGroup[];
  directLinks: { href: string; label: string }[];
  loginLabel: string;
  loginHref: string;
  registerLabel: string;
  registerHref: string;
  demoLabel: string;
  demoHref: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pm-mobile-nav">
      <button
        type="button"
        className="pm-burger"
        aria-expanded={open}
        aria-label={open ? menuCloseLabel : menuOpenLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div className="pm-mobile-drawer pm-mobile-drawer-rich">
          {groups.map((group) => (
            <div key={group.id} className="pm-mobile-group">
              <p className="pm-mobile-group-title">{group.label}</p>
              <nav className="pm-mobile-links">
                {group.items.map((item) => (
                  <Link key={item.href + item.title} href={item.href} onClick={() => setOpen(false)}>
                    {item.title}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          {directLinks.length > 0 && (
            <nav className="pm-mobile-links">
              {directLinks.map((item) => (
                <Link key={item.href + item.label} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="pm-mobile-actions">
            <Link href={loginHref} className="pm-btn pm-btn-outline" onClick={() => setOpen(false)}>
              {loginLabel}
            </Link>
            <Link href={registerHref} className="pm-btn pm-btn-outline" onClick={() => setOpen(false)}>
              {registerLabel}
            </Link>
            <Link
              href={demoHref}
              data-track-cta="mobile_sticky"
              className="pm-btn pm-btn-primary"
              onClick={() => setOpen(false)}
            >
              {demoLabel}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
