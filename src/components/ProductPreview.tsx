"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { WhatsAppIcon, InstagramIcon, TelegramIcon } from "@/components/ChannelIcons";
import { LogoMark } from "@/components/Logo";
import { CONTENT } from "@/components/marketing/ProductPreviewCopy";

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
const STAGE_ICONS: Stage[] = ["capture", "automate", "grow", "analyze"];

function StageIcon({ type }: { type: Stage }) {
  const paths: Record<Stage, ReactNode> = {
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


function ProductCatalog({ text, selected }: { text: typeof CONTENT.az | typeof CONTENT.en; selected: boolean }) {
  return (
    <div className={`pm-live-product ${selected ? "is-chosen" : ""}`}>
      <div className="pm-live-product-art" aria-hidden="true">
        <svg viewBox="0 0 90 80" width="90" height="80">
          <defs>
            <linearGradient id="qeydai-product-box" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e7d5ff"/><stop offset=".6" stopColor="#b6a1ed"/><stop offset="1" stopColor="#8272d5"/>
            </linearGradient>
          </defs>
          <ellipse cx="45" cy="69" rx="27" ry="7" fill="#b5a6d9" opacity=".35"/>
          <path d="M19 28 44 14 71 28 46 43Z" fill="#e9dafe" stroke="#aa91de"/>
          <path d="M19 28v28l27 15V43Z" fill="#9980d7" stroke="#8061b8"/>
          <path d="M46 43v28l25-15V28Z" fill="url(#qeydai-product-box)" stroke="#8061b8"/>
          <path d="M33 21 58 36" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8"/>
          <path d="M58 36v12" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8"/>
          <path d="m60 10 2.5 5 5 2-5 2-2.5 5-2.5-5-5-2 5-2Z" fill="#fbba80"/>
        </svg>
      </div>
      <div className="pm-live-product-details">
        <small>{text.catalog}</small>
        <strong>{text.product}</strong>
        <b>{text.productPrice}</b>
      </div>
      <span className={`pm-live-product-mark ${selected ? "is-active" : ""}`} aria-label={selected ? text.order : undefined}>{selected ? "✓" : "＋"}</span>
      {selected && <div className="pm-live-product-confirm">{text.order}</div>}
    </div>
  );
}

/* Original vector guide: not a copy of Kommo's characters or artwork. */
function ShowcaseGuide({ stage, phase }: { stage: Stage; phase: number }) {
  if (phase < 2) return null;
  return (
    <div className={`pm-live-guide is-${stage} is-phase-${phase}`} aria-hidden="true">
      {stage === "automate" && (
        <div className="pm-live-guide-lens">
          <span className="pm-live-guide-glass" />
          <span className="pm-live-guide-handle" />
        </div>
      )}
      <svg className="pm-live-guide-hand" viewBox="0 0 140 158" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="qeydai-hand-fill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#e5d9ff"/>
            <stop offset=".43" stopColor="#a9c8ff"/>
            <stop offset="1" stopColor="#7e64cf"/>
          </linearGradient>
          <linearGradient id="qeydai-hand-shine" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".9"/>
            <stop offset="1" stopColor="#fff" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d="M48 137c-10-13-13-22-17-42l-8-23c-2-7 1-13 8-15 7-2 13 1 16 8l3 7V28c0-9 5-14 12-14s12 5 12 14v33l6-8c6-7 15-5 19 0 3 3 4 7 3 11 8-6 16-3 20 3 3 5 2 10-1 15 7-4 15-1 18 5 3 6 0 13-4 19l-21 28c-10 14-19 18-34 19-14 1-25-5-32-16Z"
          fill="url(#qeydai-hand-fill)" stroke="#6957b5" strokeWidth="3.5" strokeLinejoin="round"/>
        <path d="M63 23v53M36 72l10 31M81 59l-9 19M104 71 92 88" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".58"/>
        <path d="M58 25c-6 13-5 30-3 42" fill="none" stroke="url(#qeydai-hand-shine)" strokeWidth="7" strokeLinecap="round"/>
        <ellipse cx="95" cy="120" rx="19" ry="8" fill="#d3c5ff" opacity=".25"/>
      </svg>
      <span className="pm-live-guide-sparkle">✦</span>
    </div>
  );
}

function CaptureScene({ phase, text }: { phase: number; text: typeof CONTENT.az | typeof CONTENT.en }) {
  return (
    <div className="pm-live-capture">
      <div className="pm-live-section-title"><strong>{text.newly}</strong><span className="pm-live-chip">3</span></div>
      <div className="pm-live-lead-list">
        {[
          { name: text.scenes[0].customer, source: "Instagram", initial: "A", color: "pink" },
          { name: text.previewLeads[0], source: "WhatsApp", initial: "K", color: "mint" },
          { name: text.previewLeads[1], source: "Telegram", initial: "L", color: "purple" },
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
  const numbers = ["24", "8", text.responseTime];
  return <div className="pm-live-analytics">
    <div className="pm-live-section-title"><strong>{text.sidebar[4]}</strong><span className="pm-live-month">{text.viewLabel}</span></div>
    <div className="pm-live-stat-grid">{text.metrics.map((label, i) => <div className="pm-live-stat" key={label}><small>{label}</small><strong>{numbers[i]}</strong><span className="pm-live-trend">↗ {i === 0 ? "18%" : i === 1 ? "12%" : "9%"}</span></div>)}</div>
    <div className="pm-live-chart"><strong>{text.chart}</strong><div className="pm-live-chart-bars">{[52, 92, 65, 78, 56, 96, 69].map((h, i) => <div key={i} className="pm-live-chart-bar-wrap"><div className="pm-live-chart-bar" style={{ height: phase >= 1 ? `${h}%` : "5%" }} /><span>{i + 1}</span></div>)}</div></div>
    {phase >= 2 && <div className="pm-live-insight" key="insight"><StageIcon type="automate" /><span><strong>{text.insight}</strong>{text.scenes[3].chat[2].message}</span></div>}
  </div>;
}

export function ProductPreview({ brand, lang = "az" }: { copy: PreviewCopy; brand: string; lobbyAlt: string; lang?: "az" | "en" }) {
  const text = CONTENT[lang];
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState(0);
  const [sceneSwitch, setSceneSwitch] = useState(false);
  const [manual, setManual] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 })
      : null;
    if (observer) observer.observe(node);
    else {
      // Fallback must display the preview on browsers without IntersectionObserver.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
    const query = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const update = () => {
      setReducedMotion(Boolean(query?.matches));
      if (query?.matches) setPhase(3);
    };
    update();
    query?.addEventListener?.("change", update);
    return () => { observer?.disconnect(); query?.removeEventListener?.("change", update); };
  }, []);

  useEffect(() => {
    if (!sceneSwitch) return;
    const id = window.setTimeout(() => setSceneSwitch(false), 600);
    return () => window.clearTimeout(id);
  }, [sceneSwitch]);

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
    setSceneSwitch(true);
    setActive(index);
    setPhase(reducedMotion ? 3 : 0);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
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
          data-switching={sceneSwitch ? "true" : undefined}
          onClick={() => selectStage(index)}
          onKeyDown={(event) => onTabKeyDown(event, index)}
        ><StageIcon type={type} /><span>{text.tabs[index].name}</span><span className="pm-live-tab-progress" aria-hidden="true" style={{ transform: index === active ? `scaleX(${(phase + 1) / 4})` : "scaleX(0)" }} /></button>)}
      </div>
      <div id="pm-live-panel" className="pm-live-frame" role="tabpanel" aria-labelledby={`pm-live-tab-${STAGE_ICONS[active]}`}>
        <div className="pm-live-scene-title" key={`scene-title-${active}`}><strong>{text.tabs[active].headline}</strong><span>{text.tabs[active].detail}</span></div>
        <div key={active} className={`pm-live-workspace is-scene-${STAGE_ICONS[active]}`}>
          <div className="pm-live-messenger">
            <div className="pm-live-messenger-header"><span className="pm-live-contact-avatar">{scene.customer.charAt(0)}</span><span><strong>{scene.customer}</strong><small><ChannelIcon type={chatIcon} /> {scene.service} <span className="pm-live-online-dot" /> {text.online}</small></span><span className="pm-live-chat-menu" aria-hidden="true">•••</span></div>
            <div className="pm-live-chat-body" key={`chat-${active}`}>
              <span className="pm-live-chat-date">21.11.2026</span>
              {scene.chat.map((message, index) => index <= phase && (
                <Fragment key={index}>
                  <div className={`pm-live-message is-${message.who}`}>
                    <span>{message.message}</span>
                    <small>10:{String(12 + index).padStart(2, "0")} {message.who === "agent" && <span className="pm-live-read-check" aria-hidden="true">✓✓</span>}</small>
                  </div>
                  {active === 2 && index === 1 && <ProductCatalog text={text} selected={phase >= 3} />}
                </Fragment>
              ))}
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
          <ShowcaseGuide stage={STAGE_ICONS[active]} phase={phase} />
        </div>
      </div>
      <div className="pm-live-footer"><span className="pm-live-scene-count">{String(active + 1).padStart(2, "0")} / 04</span><button type="button" className="pm-live-replay" onClick={() => { setManual(false); setPhase(0); }}><span aria-hidden="true">↻</span> {text.repeat}</button></div>
    </div>
  );
}
