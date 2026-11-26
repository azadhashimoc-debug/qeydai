"use client";

import { useState } from "react";

type TabItem = {
  id: string;
  label: string;
  caption: string;
  items: { channel: string; sender: string; badge: string; tone: "mint" | "sky" | "amber" }[];
  replyDraft: string;
};

export function InboxShowcaseClient({ lang }: { lang: "az" | "en" }) {
  const isEn = lang === "en";

  const tabs: TabItem[] = isEn
    ? [
        {
          id: "switch",
          label: "Switch between messaging apps",
          caption:
            "Manage WhatsApp, Instagram Direct, and Telegram inquiries inside one lead card without switching browser tabs.",
          items: [
            { channel: "WhatsApp", sender: "Ayten H. · +994 50 123 45 67", badge: "Active", tone: "mint" },
            { channel: "Instagram", sender: "@ayten.baku · Story reply", badge: "DM", tone: "amber" },
            { channel: "Telegram", sender: "@ayten_h · Booking bot", badge: "Synced", tone: "sky" },
          ],
          replyDraft: "Hi Ayten! Your appointment is confirmed for tomorrow at 16:00.",
        },
        {
          id: "assign",
          label: "Assign ownership",
          caption:
            "Route every incoming customer chat to a specific operator or branch coordinator so no message goes unanswered.",
          items: [
            { channel: "Operator", sender: "Leyla M. (Main Branch)", badge: "Assigned", tone: "mint" },
            { channel: "Operator", sender: "Elvin R. (Online Sales)", badge: "2 chats", tone: "sky" },
            { channel: "AI Copilot", sender: "Auto-triage active", badge: "24/7", tone: "amber" },
          ],
          replyDraft: "Internal note: Customer prefers evening slot after 18:30.",
        },
        {
          id: "templates",
          label: "Speed up with bots & templates",
          caption:
            "Send approved pricing details, branch addresses, and appointment reminders in one click.",
          items: [
            { channel: "Template", sender: "Appointment Address & Time", badge: "1-click", tone: "sky" },
            { channel: "Template", sender: "Service Packages & Pricing", badge: "AZN", tone: "mint" },
            { channel: "Salesbot", sender: "Slot Lock Confirmation", badge: "Auto", tone: "amber" },
          ],
          replyDraft: "Our main branch is 3 min from Nizami metro. See you at 16:00!",
        },
      ]
    : [
        {
          id: "switch",
          label: "Mesajlaşma tətbiqləri arasında keçid edin",
          caption:
            "WhatsApp, Instagram Direct və Telegram müraciətlərini əlavə pəncərə açmadan bir kliklə eyni müştəri kartında cavablandırın.",
          items: [
            { channel: "WhatsApp", sender: "Aytən H. · +994 50 123 45 67", badge: "Aktiv", tone: "mint" },
            { channel: "Instagram", sender: "@ayten.baku · Hekayə cavabı", badge: "DM", tone: "amber" },
            { channel: "Telegram", sender: "@ayten_h · Qeydiyyat botu", badge: "Bağlı", tone: "sky" },
          ],
          replyDraft: "Salam Aytən! Sabah saat 16:00 üçün görüşünüz təsdiqləndi.",
        },
        {
          id: "assign",
          label: "Məsul şəxs təyin edin",
          caption:
            "Gələn hər müraciəti filial koordinatoruna və ya satış operatoruna yönləndirin ki, heç bir mesaj cavabsız qalmasın.",
          items: [
            { channel: "Operator", sender: "Leyla M. (Əsas Filial)", badge: "Təyin edilib", tone: "mint" },
            { channel: "Operator", sender: "Elvin R. (Onlayn Satış)", badge: "2 söhbət", tone: "sky" },
            { channel: "AI Köməkçi", sender: "Avtomatik yönləndirmə", badge: "24/7", tone: "amber" },
          ],
          replyDraft: "Daxili qeyd: Müştəri 18:30-dan sonrakı axşam saatına üstünlük verir.",
        },
        {
          id: "templates",
          label: "Bot və şablonlarla sürətlənin",
          caption:
            "Hazır qiymət cədvəllərini, filial ünvanını və görüş xatırlatmalarını tək kliklə göndərin.",
          items: [
            { channel: "Şablon", sender: "Görüş Ünvanı və Saatı", badge: "1-klik", tone: "sky" },
            { channel: "Şablon", sender: "Xidmət Paketləri və Qiymət", badge: "AZN", tone: "mint" },
            { channel: "Salesbot", sender: "Boş Vaxt Kilidi Təsdiqi", badge: "Avto", tone: "amber" },
          ],
          replyDraft: "Əsas filialımız Nizami metrosundan 3 dəq məsafədədir. Saat 16:00-da gözləyirik!",
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
              <strong>{isEn ? "UNIFIED INBOX" : "VAHİD GƏLƏN QUTU"}</strong>
              <span className="pm-pipe-mini-badge">
                {isEn ? "3 Channels" : "3 Kanal"}
              </span>
            </div>
            <div className="pm-pipe-mini-rows">
              {active.items.map((item) => (
                <div key={item.sender} className="pm-pipe-mini-row">
                  <span>
                    <strong>{item.channel}:</strong> {item.sender}
                  </span>
                  <span className={`pm-pipe-stage is-${item.tone}`}>{item.badge}</span>
                </div>
              ))}
            </div>
            <div className="pm-inbox-reply-preview">
              <span>{active.replyDraft}</span>
              <span className="pm-inbox-send-chip">{isEn ? "Send" : "Göndər"}</span>
            </div>
          </div>
          <p className="pm-pipe-yellow-caption">{active.caption}</p>
        </div>

        <div className="pm-pipe-focus-copy">
          <h2>
            {isEn ? "Start conversations that convert" : "Satış gətirən söhbətlər başladın"}
          </h2>
          <p className="pm-subhero-sub">
            {isEn
              ? "Meet prospective customers on the messaging apps they already use every day in Azerbaijan."
              : "Potensial müştərilərinizlə Azərbaycanda hər gün istifadə etdikləri mesajlaşma tətbiqlərində tək pəncərədən əlaqə saxlayın."}
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
