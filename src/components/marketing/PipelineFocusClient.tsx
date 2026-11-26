"use client";

import { useState } from "react";

type TabItem = {
  id: string;
  label: string;
  caption: string;
  rows: { title: string; stage: string; tone: "sky" | "amber" | "mint" }[];
};

export function PipelineFocusClient({ lang }: { lang: "az" | "en" }) {
  const isEn = lang === "en";

  const tabs: TabItem[] = isEn
    ? [
        {
          id: "views",
          label: "Switch between views",
          caption:
            "Choose the view that fits your workflow: Kanban keeps the big picture clear, while List view lets you inspect every lead detail.",
          rows: [
            { title: "Dental check-up · Ayten H.", stage: "New lead", tone: "sky" },
            { title: "Sofa order · Kamran A.", stage: "Booked", tone: "amber" },
            { title: "General English B2 · Nigar M.", stage: "Enrolled", tone: "mint" },
            { title: "Wedding make-up · Murad K.", stage: "Booked", tone: "amber" },
          ],
        },
        {
          id: "filters",
          label: "Save your favorite filters",
          caption:
            "Pin quick filters by channel (WhatsApp, Instagram, Telegram), branch, or unassigned operator.",
          rows: [
            { title: "WhatsApp · Unanswered > 5m", stage: "Priority", tone: "amber" },
            { title: "Instagram DM · Today's bookings", stage: "Confirmed", tone: "mint" },
            { title: "Telegram Bot · New inquiries", stage: "Auto-reply", tone: "sky" },
          ],
        },
        {
          id: "multi",
          label: "Create multiple pipelines",
          caption:
            "Separate new bookings, monthly renewals, and corporate orders into dedicated pipelines.",
          rows: [
            { title: "Baku Main Branch — Bookings", stage: "14 active", tone: "sky" },
            { title: "Online Store — Monthly Funnel", stage: "22 active", tone: "mint" },
            { title: "Corporate English — B2B Funnel", stage: "6 active", tone: "amber" },
          ],
        },
      ]
    : [
        {
          id: "views",
          label: "Görünüşlər arasında keçid edin",
          caption:
            "İşinizə uyğun görünüşü seçin: Kanban ümumi satış gedişatını göstərir, Siyahı görünüşü isə detalları sürətli yoxlamağa imkan verir.",
          rows: [
            { title: "Diş müayinəsi · Aytən H.", stage: "Yeni sorğu", tone: "sky" },
            { title: "Divan sifarişi · Kamran Ə.", stage: "Rezervasiya", tone: "amber" },
            { title: "Ümumi İngilis B2 · Nigar M.", stage: "Qeydiyyat", tone: "mint" },
            { title: "Toy makiyajı · Murad K.", stage: "Rezervasiya", tone: "amber" },
          ],
        },
        {
          id: "filters",
          label: "Sevimli filtrlərinizi yadda saxlayın",
          caption:
            "Kanal (WhatsApp, Instagram, Telegram), filial və ya cavabsız müraciətlər üzrə hazır filtrləri bir kliklə açın.",
          rows: [
            { title: "WhatsApp · Cavab gözləyən", stage: "Təcili", tone: "amber" },
            { title: "Instagram DM · Bugünkü görüşlər", stage: "Təsdiqləndi", tone: "mint" },
            { title: "Telegram Bot · Yeni müraciətlər", stage: "Avto-cavab", tone: "sky" },
          ],
        },
        {
          id: "multi",
          label: "Birdən çox satış xətti yaradın",
          caption:
            "Yeni rezervasiyalar, aylıq ödəniş yenilənmələri və korporativ sifarişlər üçün ayrı-ayrı satış xətləri qurun.",
          rows: [
            { title: "Bakı Mərkəz — Rezervasiyalar", stage: "14 aktiv", tone: "sky" },
            { title: "Onlayn Mağaza — Aylıq Xətt", stage: "22 aktiv", tone: "mint" },
            { title: "Korporativ Təlim — B2B Xətti", stage: "6 aktiv", tone: "amber" },
          ],
        },
      ];

  const [activeId, setActiveId] = useState(tabs[0].id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <section className="pm-section">
      <div className="pm-wrap pm-pipe-focus-grid">
        <div className="pm-pipe-yellow-card">
          <div className="pm-pipe-mini-window">
            <div className="pm-pipe-mini-head">
              <strong>{isEn ? "SALES PIPELINE" : "SATIŞ İZLƏMƏ XƏTTİ"}</strong>
              <span className="pm-pipe-mini-badge">
                {isEn ? "Live" : "Canlı"}
              </span>
            </div>
            <div className="pm-pipe-mini-rows">
              {active.rows.map((r) => (
                <div key={r.title} className="pm-pipe-mini-row">
                  <span>{r.title}</span>
                  <span className={`pm-pipe-stage is-${r.tone}`}>{r.stage}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="pm-pipe-yellow-caption">{active.caption}</p>
        </div>

        <div className="pm-pipe-focus-copy">
          <h2>
            {isEn ? "Reclaim your focus" : "Diqqətinizi geri qazanın"}
          </h2>
          <p className="pm-subhero-sub">
            {isEn
              ? "Move lead details out of scattered notebooks and chats into a structured pipeline so your team focuses on real enrollments."
              : "Müraciət detallarını dağınıq dəftər və çat qeydlərindən çıxarıb sistemli satış xəttinə köçürün ki, komandanız real qeydiyyata fokuslansın."}
          </p>
          <div className="pm-pipe-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeId === t.id}
                onClick={() => setActiveId(t.id)}
                className={
                  activeId === t.id ? "pm-pipe-tab is-active" : "pm-pipe-tab"
                }
              >
                <span aria-hidden="true">←</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
