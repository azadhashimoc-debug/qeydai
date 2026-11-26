"use client";

import { useState } from "react";

type ViewKey = "pipeline" | "list" | "inbox";

type LeadCard = {
  name: string;
  course: string;
  amount: string;
  channel: string;
  tag: string;
};

export function ProductViewSwitcherClient({ lang }: { lang: "az" | "en" }) {
  const [view, setView] = useState<ViewKey>("pipeline");
  const isEn = lang === "en";

  const tabs: { key: ViewKey; label: string }[] = [
    { key: "pipeline", label: isEn ? "Pipeline view" : "Pipeline görünüşü" },
    { key: "list", label: isEn ? "List view" : "Siyahı görünüşü" },
    { key: "inbox", label: isEn ? "Inbox view" : "Gələn qutu görünüşü" },
  ];

  const leads: LeadCard[] = isEn
    ? [
        { name: "Ayten Hasanova", course: "Dental Consultation", amount: "180 AZN", channel: "WhatsApp", tag: "Booking today" },
        { name: "Kamran Aliyev", course: "Home Interior Package", amount: "240 AZN", channel: "Instagram", tag: "New lead" },
        { name: "Nigar Mammadova", course: "Salon Care Bundle", amount: "150 AZN", channel: "Telegram", tag: "Confirmed" },
        { name: "Tural Rzayev", course: "B2B Audit Service", amount: "220 AZN", channel: "WhatsApp", tag: "Follow-up" },
      ]
    : [
        { name: "Aytən Həsənova", course: "Klinika Konsultasiyası", amount: "180 AZN", channel: "WhatsApp", tag: "Bu gün görüş" },
        { name: "Kamran Əliyev", course: "İnteryer Paketi", amount: "240 AZN", channel: "Instagram", tag: "Yeni sorğu" },
        { name: "Nigar Məmmədova", course: "Salon Baxım Paketi", amount: "150 AZN", channel: "Telegram", tag: "Təsdiqləndi" },
        { name: "Tural Rzayev", course: "Biznes Xidməti", amount: "220 AZN", channel: "WhatsApp", tag: "Təqibdə" },
      ];

  return (
    <section className="pm-prod-showcase">
      <div className="pm-wrap">
        <div className="pm-prod-board">
          {view === "pipeline" && (
            <div className="pm-prod-kanban">
              {[
                { col: isEn ? "First Contact" : "İlk Təmas", cards: [leads[1], leads[3]] },
                { col: isEn ? "Appointment Set" : "Görüş Təyin Edildi", cards: [leads[0]] },
                { col: isEn ? "Closed Won" : "Ödəniş Edildi", cards: [leads[2]] },
              ].map((column) => (
                <div key={column.col} className="pm-prod-col">
                  <div className="pm-prod-col-head">
                    <span>{column.col}</span>
                    <span className="pm-prod-col-count">{column.cards.length}</span>
                  </div>
                  {column.cards.map((c) => (
                    <div key={c.name} className="pm-prod-card">
                      <div className="pm-prod-card-top">
                        <strong>{c.name}</strong>
                        <span className="pm-prod-chip">{c.channel}</span>
                      </div>
                      <p>{c.course}</p>
                      <div className="pm-prod-card-foot">
                        <span>{c.amount}</span>
                        <span className="pm-prod-tag">{c.tag}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {view === "list" && (
            <div className="pm-prod-list">
              {leads.map((c) => (
                <div key={c.name} className="pm-prod-list-row">
                  <strong>{c.name}</strong>
                  <span>{c.course}</span>
                  <span className="pm-prod-chip">{c.channel}</span>
                  <span className="pm-prod-tag">{c.tag}</span>
                  <strong>{c.amount}</strong>
                </div>
              ))}
            </div>
          )}

          {view === "inbox" && (
            <div className="pm-prod-inbox">
              <div className="pm-prod-inbox-sidebar">
                {leads.map((c, idx) => (
                  <div
                    key={c.name}
                    className={idx === 0 ? "pm-prod-thread is-active" : "pm-prod-thread"}
                  >
                    <strong>{c.name}</strong>
                    <span>{c.channel} · {c.tag}</span>
                  </div>
                ))}
              </div>
              <div className="pm-prod-inbox-chat">
                <div className="pm-prod-msg is-in">
                  {isEn
                    ? "Hello, do you have an open appointment slot today?"
                    : "Salam, bu gün saat neçədə boş görüş vaxtınız var?"}
                </div>
                <div className="pm-prod-msg is-out">
                  {isEn
                    ? "Hi Ayten! We have 2 slots open at 16:00. Shall I confirm your booking?"
                    : "Salam Aytən! Saat 16:00 üçün boş vaxtımız var. Sizin üçün təsdiqləyək?"}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pm-prod-switcher-copy">
          <h2>
            {isEn
              ? "All your leads right at your fingertips"
              : "Bütün müştəriləriniz əlinizin altında"}
          </h2>
          <p>
            {isEn
              ? "Switch your workflow across 3 instant CRM views:"
              : "İş axınınızı 3 fərqli görünüşdə idarə edin:"}
          </p>
          <div className="pm-prod-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={view === t.key}
                onClick={() => setView(t.key)}
                className={view === t.key ? "pm-prod-tab is-active" : "pm-prod-tab"}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
