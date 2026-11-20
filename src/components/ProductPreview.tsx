"use client";

import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon, InstagramIcon, TelegramIcon } from "@/components/ChannelIcons";
import { LogoMark } from "@/components/Logo";

export type PreviewCopy = {
  tabs: { inbox: string; pipeline: string; bookings: string; analytics: string };
  menu: { overview: string; inbox: string; pipeline: string; bookings: string; analytics: string };
  stages: { new: string; talking: string; booked: string };
  people: { one: string; two: string; three: string };
  topics: { one: string; two: string; three: string };
  incoming: string;
  outgoing: string;
  confirmed: string;
  times: { one: string; two: string; three: string };
  seats: { one: string; two: string; three: string };
  channelFilter: string;
  sampleBadge: string;
  unreadBadge: string;
  assigneeLabel: string;
  metrics: { one: string; two: string; three: string };
  metricValues: { one: string; two: string; three: string };
};

type Stage = "capture" | "automate" | "grow" | "analyze";
type Scene = {
  name: string;
  headline: string;
  detail: string;
  customer: string;
  service: string;
  chat: { who: "customer" | "agent"; message: string }[];
};

const CONTENT = {
  az: {
    showcase: "QeydAI iş başında",
    sample: "İnteraktiv nümayiş · real müştəri məlumatı deyil",
    repeat: "Yenidən göstər",
    sidebar: ["İcmal", "Mesajlar", "Satışlar", "Təqvim", "Analitika"],
    tabs: [
      { name: "Cəlb et", headline: "Hər mesaj yeni fürsətdir", detail: "Bütün müraciətlər bir yerdə toplanır." },
      { name: "Avtomatlaşdır", headline: "AI cavab verir, görüş yaranır", detail: "Müştəri yazır, QeydAI təqvimi yoxlayır." },
      { name: "Böyüt", headline: "Satışları nəzarətdə saxlayın", detail: "Müştərilər satış mərhələləri üzrə irəliləyir." },
      { name: "Təhlil et", headline: "Nəticələri aydın görün", detail: "Hansının daha yaxşı işlədiyini anlayın." },
    ],
    scenes: [
      {
        name: "Yeni müraciət", headline: "Bütün mesajlar bir yerdə", detail: "Yeni müştəri kartı avtomatik görünür.",
        customer: "Aysel Məmmədova", service: "Instagram",
        chat: [
          { who: "customer", message: "Salam! Məhsul haqqında məlumat ala bilərəm?" },
          { who: "agent", message: "Salam! Əlbəttə, sizə kömək edim. 🌿" },
          { who: "customer", message: "Çatdırılma da var?" },
        ],
      },
      {
        name: "Avtomatik rezervasiya", headline: "AI təqvimi yoxlayır", detail: "Boş vaxt seçilir və görüş yaradılır.",
        customer: "Nərmin Əliyeva", service: "WhatsApp",
        chat: [
          { who: "customer", message: "Salam, sabah saat 15:00-a yer var?" },
          { who: "agent", message: "Salam! Bir dəqiqə, təqvimi yoxlayıram. ✨" },
          { who: "agent", message: "Bəli, saat 15:00 boşdur. Görüşünüzü qeyd etdim! ✅" },
        ],
      },
      {
        name: "Satışın idarəsi", headline: "Müraciətdən satışa", detail: "Satış kartı növbəti mərhələyə keçir.",
        customer: "Elvin Qasımov", service: "Telegram",
        chat: [
          { who: "customer", message: "Salam, bu dəsti sifariş etmək istəyirəm." },
          { who: "agent", message: "Əla! Sifariş məlumatlarını dəqiqləşdirək." },
          { who: "customer", message: "Təsdiq edirəm, təşəkkürlər!" },
        ],
      },
      {
        name: "Satış hesabatı", headline: "Hər nəticə göz önündə", detail: "Mesajlardan satışa gedən yolu izləyin.",
        customer: "QeydAI köməkçisi", service: "AI xülasəsi",
        chat: [
          { who: "agent", message: "Bu həftə ən çox müraciət WhatsApp-dan gəlib." },
          { who: "agent", message: "24 yeni müraciət və 8 tamamlanmış satış var." },
          { who: "agent", message: "Tövsiyə: cavabsız müraciətləri izləyin." },
        ],
      },
    ] satisfies Scene[],
    newly: "Yeni müraciətlər",
    captured: "Yeni müştəri əlavə edildi",
    incoming: "Yeni mesaj",
    created: "Yeni müştəri kartı",
    open: "Müştəri profili",
    booking: "Rezervasiyalar",
    days: ["B.e.", "Ç.a.", "Ç.", "C.a.", "C."],
    booked: "Görüş təsdiqləndi",
    consultation: "Müştəri görüşü",
    stages: ["Yeni", "Danışıqda", "Tamamlandı"],
    deal: "Yeni sifariş",
    won: "Satış tamamlandı",
    metrics: ["Yeni müraciətlər", "Tamamlanan satışlar", "Cavab sürəti"],
    insight: "AI tövsiyəsi",
    chart: "Kanallar üzrə müraciətlər",
    viewLabel: "Nümunə",
    typing: "QeydAI yazır",
  },
  en: {
    showcase: "See QeydAI in action",
    sample: "Interactive preview · no real customer data",
    repeat: "Replay animation",
    sidebar: ["Overview", "Inbox", "Sales", "Calendar", "Analytics"],
    tabs: [
      { name: "Capture", headline: "Every message is an opportunity", detail: "Keep every inquiry in one place." },
      { name: "Automate", headline: "AI replies, bookings appear", detail: "A customer asks and QeydAI checks the calendar." },
      { name: "Grow", headline: "Stay on top of sales", detail: "Move customers through your sales stages." },
      { name: "Analyze", headline: "See every result clearly", detail: "Understand what works best." },
    ],
    scenes: [
      {
        name: "New lead", headline: "Every message in one place", detail: "A new lead appears automatically.",
        customer: "Aysel Mammadova", service: "Instagram",
        chat: [
          { who: "customer", message: "Hi! Can I ask about your products?" },
          { who: "agent", message: "Absolutely! Happy to help. 🌿" },
          { who: "customer", message: "Do you offer delivery?" },
        ],
      },
      {
        name: "Automatic booking", headline: "AI checks the calendar", detail: "An open time is selected and booked.",
        customer: "Narmin Aliyeva", service: "WhatsApp",
        chat: [
          { who: "customer", message: "Hi, is 3 pm tomorrow available?" },
          { who: "agent", message: "Let me check the calendar. ✨" },
          { who: "agent", message: "Yes, 3 pm is open. You're booked! ✅" },
        ],
      },
      {
        name: "Sales management", headline: "From message to sale", detail: "A deal moves to its next stage.",
        customer: "Elvin Gasimov", service: "Telegram",
        chat: [
          { who: "customer", message: "Hello, I'd like to order this set." },
          { who: "agent", message: "Great! Let's confirm the details." },
          { who: "customer", message: "Confirmed, thank you!" },
        ],
      },
      {
        name: "Sales report", headline: "See every outcome", detail: "Track the journey from chats to sales.",
        customer: "QeydAI assistant", service: "AI summary",
        chat: [
          { who: "agent", message: "WhatsApp brought the most inquiries this week." },
          { who: "agent", message: "24 new leads and 8 completed sales." },
          { who: "agent", message: "Suggestion: follow up with unanswered leads." },
        ],
      },
    ] satisfies Scene[],
    newly: "New inquiries",
    captured: "New customer added",
    incoming: "New message",
    created: "New customer card",
    open: "Customer profile",
    booking: "Appointments",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    booked: "Booking confirmed",
    consultation: "Customer appointment",
    stages: ["New", "In progress", "Completed"],
    deal: "New order",
    won: "Sale completed",
    metrics: ["New leads", "Completed sales", "Response time"],
    insight: "AI insight",
    chart: "Leads by channel",
    viewLabel: "Preview",
    typing: "QeydAI is typing",
  },
} as const;

const STAGE_ICONS: Stage[] = ["capture", "automate", "grow", "analyze"];

function StageIcon({ type }: { type: Stage }) {
  const paths: Record<Stage, React.ReactNode> = {
    capture: <><path d="M3 5h12v9H8l-4 4V5Z" /><path d="M17 7h4v9h-5" /></>,
    automate: <><path d="m12 2 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" /><path d="m19 17 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" /></>,
    grow: <><path d="M4 19V5M4 19h17M7 15l5-5 3 3 5-6" /><path d="M15 7h5v5" /></>,
    analyze: <><path d="M3 3v18h18" /><rect x="6" y="12" width="3" height="6" rx="1" /><rect x="11" y="8" width="3" height="10" rx="1" /><rect x="16" y="4" width="3" height="14" rx="1" /></>,
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

function ChannelIcon({ type }: { type: number }) {
  return type === 0 ? <WhatsAppIcon size={17} /> : type === 1 ? <InstagramIcon size={17} /> : <TelegramIcon size={17} />;
}

function CaptureScene({ phase, text }: { phase: number; text: typeof CONTENT.az | typeof CONTENT.en }) {
  return (
    <div className="pm-live-capture">
      <div className="pm-live-section-title"><strong>{text.newly}</strong><span className="pm-live-chip">3</span></div>
      <div className="pm-live-lead-list">
        {[
          { name: text.scenes[0].customer, source: "Instagram", initial: "A", color: "pink" },
          { name: "Kamran Hüseynov", source: "WhatsApp", initial: "K", color: "mint" },
          { name: "Lalə Rzayeva", source: "Telegram", initial: "L", color: "purple" },
        ].map((item, index) => <div key={item.name} className={`pm-live-lead ${index === 0 && phase >= 2 ? "is-new" : ""}`}>
          <span className={`pm-live-avatar is-${item.color}`}>{item.initial}</span>
          <span><strong>{item.name}</strong><small>{item.source}</small></span>
          <span className="pm-live-lead-dot" />
        </div>)}
      </div>
      {phase >= 2 && <div className="pm-live-confirmation" key="lead-confirmed"><span>✓</span>{text.captured}</div>}
    </div>
  );
}

function BookingScene({ phase, text }: { phase: number; text: typeof CONTENT.az | typeof CONTENT.en }) {
  return (
    <div className="pm-live-booking">
      <div className="pm-live-section-title"><strong>{text.booking}</strong><span className="pm-live-month">21 · 11 · 2026</span></div>
      <div className="pm-live-calendar">
        <div className="pm-live-calendar-hours"><span /><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span></div>
        {text.days.map((day, i) => <div key={day} className={`pm-live-calendar-day ${i === 2 ? "is-current" : ""}`}><div className="pm-live-day-head">{day}</div><div className="pm-live-calendar-slots">{i === 2 && phase >= 2 ? <div className="pm-live-calendar-event" key="meeting"><strong>15:00</strong><span>{text.consultation}</span><small>{text.scenes[1].customer}</small></div> : i === 1 ? <div className="pm-live-calendar-existing">11:00</div> : null}</div></div>)}
      </div>
      {phase >= 3 && <div className="pm-live-confirmation" key="booking-confirmed"><span>✓</span>{text.booked}</div>}
    </div>
  );
}

function GrowScene({ phase, text }: { phase: number; text: typeof CONTENT.az | typeof CONTENT.en }) {
  const position = phase >= 3 ? 2 : phase >= 2 ? 1 : 0;
  return <div className="pm-live-pipeline">
    <div className="pm-live-section-title"><strong>{text.sidebar[2]}</strong><span className="pm-live-chip">3</span></div>
    <div className="pm-live-columns">{text.stages.map((stage, index) => <div className="pm-live-column" key={stage}>
      <div className="pm-live-column-head"><span className={`pm-live-stage-dot is-${index}`} />{stage}<span>{position === index ? "1" : index === 2 ? "1" : "0"}</span></div>
      <div className="pm-live-column-body">
        {index === position && <div className="pm-live-deal" key={`deal-${position}`}><span className="pm-live-deal-tag"><ChannelIcon type={2} /> Telegram</span><strong>{text.deal}</strong><small>{text.scenes[2].customer}</small><b>149 AZN</b></div>}
        {index === 2 && position !== 2 && <div className="pm-live-deal is-muted"><span className="pm-live-deal-tag">✓</span><strong>89 AZN</strong><small>—</small></div>}
      </div>
    </div>)}</div>
    {phase === 3 && <div className="pm-live-confirmation" key="won"><span>✓</span>{text.won}</div>}
  </div>;
}

function AnalyzeScene({ phase, text }: { phase: number; text: typeof CONTENT.az | typeof CONTENT.en }) {
  const numbers = ["24", "8", "2 dəq"];
  return <div className="pm-live-analytics">
    <div className="pm-live-section-title"><strong>{text.sidebar[4]}</strong><span className="pm-live-month">{text.viewLabel}</span></div>
    <div className="pm-live-stat-grid">{text.metrics.map((label, i) => <div className="pm-live-stat" key={label}><small>{label}</small><strong>{i === 2 && text === CONTENT.en ? "2 min" : numbers[i]}</strong><span className="pm-live-trend">↗ {i === 0 ? "18%" : i === 1 ? "12%" : "9%"}</span></div>)}</div>
    <div className="pm-live-chart"><strong>{text.chart}</strong><div className="pm-live-chart-bars">{[52, 92, 65, 78, 56, 96, 69].map((h, i) => <div key={i} className="pm-live-chart-bar-wrap"><div className="pm-live-chart-bar" style={{ height: phase >= 1 ? `${h}%` : "5%" }} /><span>{i + 1}</span></div>)}</div></div>
    {phase >= 2 && <div className="pm-live-insight" key="insight"><StageIcon type="automate" /><span><strong>{text.insight}</strong>{text.scenes[3].chat[2].message}</span></div>}
  </div>;
}

export function ProductPreview({ copy, brand, lang = "az" }: { copy: PreviewCopy; brand: string; lobbyAlt: string; lang?: "az" | "en" }) {
  const text = CONTENT[lang];
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState(0);
  const [manual, setManual] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => { observer.disconnect(); query.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    if (!visible || paused || reducedMotion) return;
    const timer = window.setTimeout(() => {
      if (phase >= 3) {
        setPhase(0);
        if (!manual) setActive((previous) => (previous + 1) % 4);
      } else {
        setPhase((previous) => previous + 1);
      }
    }, phase === 3 ? 2600 : 1800);
    return () => window.clearTimeout(timer);
  }, [visible, paused, reducedMotion, manual, phase]);

  function selectStage(index: number) {
    setManual(true);
    setActive(index);
    setPhase(reducedMotion ? 3 : 0);
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % 4;
    else if (event.key === "ArrowLeft") next = (index + 3) % 4;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 3;
    else return;
    event.preventDefault();
    selectStage(next);
    tabRefs.current[next]?.focus();
  }

  const scene = text.scenes[active];
  const sideSelected = [1, 3, 2, 4][active];
  const chatIcon = active === 0 ? 1 : active === 1 ? 0 : 2;

  return (
    <div className="pm-live" ref={root} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false); }}>
      <div className="pm-live-heading">
        <span className="pm-live-eyebrow"><StageIcon type="automate" />{text.showcase}</span>
        <span className="pm-live-caption">{text.sample}</span>
      </div>
      <div className="pm-live-tabs" role="tablist" aria-label={text.showcase}>
        {STAGE_ICONS.map((type, index) => <button
          key={type}
          id={`pm-live-tab-${type}`}
          ref={(el) => { tabRefs.current[index] = el; }}
          type="button"
          role="tab"
          aria-controls="pm-live-panel"
          aria-selected={index === active}
          tabIndex={index === active ? 0 : -1}
          className={`pm-live-tab ${index === active ? "is-active" : ""}`}
          onClick={() => selectStage(index)}
          onKeyDown={(event) => onTabKeyDown(event, index)}
        ><StageIcon type={type} /><span>{text.tabs[index].name}</span><span className="pm-live-tab-progress" aria-hidden="true" /></button>)}
      </div>
      <div id="pm-live-panel" className="pm-live-frame" role="tabpanel" aria-labelledby={`pm-live-tab-${STAGE_ICONS[active]}`}>
        <div className="pm-live-scene-title" key={`scene-title-${active}`}><strong>{text.tabs[active].headline}</strong><span>{text.tabs[active].detail}</span></div>
        <div className="pm-live-workspace">
          <div className="pm-live-messenger">
            <div className="pm-live-messenger-header"><span className="pm-live-contact-avatar">{scene.customer.charAt(0)}</span><span><strong>{scene.customer}</strong><small><ChannelIcon type={chatIcon} /> {scene.service}</small></span><span className="pm-live-chat-menu" aria-hidden="true">•••</span></div>
            <div className="pm-live-chat-body" key={`chat-${active}`}>
              <span className="pm-live-chat-date">21.11.2026</span>
              {scene.chat.map((message, index) => index <= phase && <div key={index} className={`pm-live-message is-${message.who}`}><span>{message.message}</span><small>10:{String(12 + index).padStart(2, "0")}</small></div>)}
              {phase < scene.chat.length - 1 && scene.chat[phase + 1].who === "agent" && <div className="pm-live-typing" aria-label={text.typing}><i /><i /><i /></div>}
              {phase >= 2 && active === 1 && <div className="pm-live-ai-status"><StageIcon type="automate" />{scene.headline}</div>}
            </div>
            <div className="pm-live-message-compose" aria-hidden="true"><span>＋</span><span>•••</span><span className="pm-live-compose-send">➤</span></div>
          </div>
          <div className="pm-live-crm">
            <aside className="pm-live-side-nav" aria-hidden="true"><div className="pm-live-mark"><LogoMark size={22} /></div>{STAGE_ICONS.map((type, index) => <div className={`pm-live-side-item ${index === active ? "is-active" : ""}`} key={type}><StageIcon type={type} /></div>)}</aside>
            <div className="pm-live-crm-content"><div className="pm-live-crm-top"><span><strong translate="no">{brand}</strong><small> / {text.sidebar[sideSelected]}</small></span><span className="pm-live-crm-topright"><span className="pm-live-green-dot" />{text.viewLabel}</span></div>
              <div className="pm-live-crm-area" key={`crm-${active}`}>
                {active === 0 && <CaptureScene phase={phase} text={text} />}
                {active === 1 && <BookingScene phase={phase} text={text} />}
                {active === 2 && <GrowScene phase={phase} text={text} />}
                {active === 3 && <AnalyzeScene phase={phase} text={text} />}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pm-live-footer"><span className="pm-live-scene-count">{String(active + 1).padStart(2, "0")} / 04</span><button type="button" className="pm-live-replay" onClick={() => { setManual(false); setPhase(0); }}><span aria-hidden="true">↻</span> {text.repeat}</button></div>
    </div>
  );
}
