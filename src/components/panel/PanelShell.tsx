"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { buttonClass } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { WorkspaceSetup } from "./WorkspaceSetup";
import { ContactDetail } from "./ContactDetail";
import { DealDetail } from "./DealDetail";
import { DealList } from "./DealList";
import { OverviewTab } from "./OverviewTab";
import { CopilotDrawer } from "./CopilotDrawer";
import { TrialBanner } from "./TrialBanner";
import { PANEL_HINT_COOKIE_NAME } from "./session-hint";

// Secondary tabs load on first open so the default (overview) view ships less JavaScript.
const PanelSettings = dynamic(() => import("./PanelSettings").then((m) => m.PanelSettings));
const ChannelsTab = dynamic(() => import("./ChannelsTab").then((m) => m.ChannelsTab));
const AiTab = dynamic(() => import("./AiTab").then((m) => m.AiTab));
const PlansTab = dynamic(() => import("./PlansTab").then((m) => m.PlansTab));
const InboxTab = dynamic(() => import("./InboxTab").then((m) => m.InboxTab));
const LeadsTab = dynamic(() => import("./LeadsTab").then((m) => m.LeadsTab));
const SessionsTab = dynamic(() => import("./SessionsTab").then((m) => m.SessionsTab));
const TeamStageTab = dynamic(() => import("./TeamStageTab").then((m) => m.TeamStageTab));

/** True when the non-secret login hint cookie is present; the real session cookie is HttpOnly. */
function hasPanelSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim().startsWith(`${PANEL_HINT_COOKIE_NAME}=1`));
}
import type {
  LeadRecord,
  OverviewPayload,
  PanelDict,
  PanelLocale,
  PanelSession,
  PanelTabId,
  SalesContact,
  SalesDeal,
  SalesFieldDef,
  SalesMember,
  SalesMemberRole,
  SalesPhoneMatch,
  SalesStage,
  SalesWorkspace,
} from "./types";

type PanelShellProps = {
  lang: PanelLocale;
  brand: string;
  d: PanelDict;
  skipToMain: string;
};

const TAB_ORDER: readonly PanelTabId[] = [
  "overview",
  "deals",
  "contacts",
  "sessions",
  "leads",
  "inbox",
  "channels",
  "ai",
  "plans",
  "settings",
] as const;

const PANEL_TAB_ICONS: Record<PanelTabId, string> = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  deals: "M3 4h6v16H3z M9 4h6v11H9z M15 4h6v6h-6z",
  contacts: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-6-8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm3-4a4 4 0 0 1 0 8",
  sessions: "M3 5h18v16H3z M7 3v4m10-4v4M3 10h18",
  leads: "M5 3h9l5 5v13H5z M14 3v6h5M8 13h8m-8 4h6",
  inbox: "M3 4h18v13H10l-5 4v-4H3z M7 8h10m-10 4h7",
  channels: "M2 3h6v6H2zm14 0h6v6h-6zm-7 12h6v6H9z M5 9v3h14V9m-7 3v3",
  ai: "m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7z",
  plans: "M2 5h20v14H2z M2 10h20M6 15h4",
  settings: "M10 3h4l1 3 3 1 3 3-2 2 1 3-3 4-3-1-2 3-4-1-1-3-3-1-1-4 2-2V7l4-2z M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0z",
};

export function PanelShell({ lang, brand, d, skipToMain }: PanelShellProps) {
  const [authState, setAuthState] = useState<"checking" | "unauthenticated" | "authenticated">("checking");
  const [tenantId, setTenantId] = useState<string>("");
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = searchParams.get("tab") === "settings" ? "settings" : "overview";
  const [activeTab, setActiveTab] = useState<PanelTabId>(initialTab);
  const [selectedInboxLeadId, setSelectedInboxLeadId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [sessions, setSessions] = useState<PanelSession[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [stages, setStages] = useState<SalesStage[]>([]);
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [members, setMembers] = useState<SalesMember[]>([]);
  const [fieldDefs, setFieldDefs] = useState<SalesFieldDef[]>([]);
  const [phoneMatches, setPhoneMatches] = useState<SalesPhoneMatch[]>([]);
  const [workspace, setWorkspace] = useState<SalesWorkspace | null>(null);
  const [actorRole, setActorRole] = useState<SalesMemberRole>("owner");
  const [actorMemberId, setActorMemberId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partialLoadError, setPartialLoadError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tabBaseId = useId();
  const tabRefs = useRef<Partial<Record<PanelTabId, HTMLButtonElement | null>>>({});
  const sessionEpochRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearSensitiveState = useCallback(() => {
    setTenantId("");
    setOverview(null);
    setSessions([]);
    setLeads([]);
    setDeals([]);
    setStages([]);
    setContacts([]);
    setMembers([]);
    setFieldDefs([]);
    setPhoneMatches([]);
    setWorkspace(null);
    setActorRole("owner");
    setActorMemberId(null);
    setSelectedInboxLeadId(null);
    setSelectedDealId(null);
    setSelectedContactId(null);
    setActiveTab("overview");
    setLoadError(null);
    setPartialLoadError(false);
  }, []);

  const handleUnauthorized = useCallback(() => {
    sessionEpochRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearSensitiveState();
    setAuthState("unauthenticated");
  }, [clearSensitiveState]);

  const loadPanelData = useCallback(async () => {
    const epoch = sessionEpochRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingData(true);
    setLoadError(null);
    setPartialLoadError(false);
    try {
      const [
        ovRes,
        sesRes,
        leadRes,
        dealRes,
        stageRes,
        contactRes,
        memberRes,
        fieldRes,
        matchRes,
        wsRes,
      ] = await Promise.all([
        fetch("/api/panel/overview", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/sessions", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/leads", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/deals", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/stages", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/contacts", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/members", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/custom-fields", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/phone-matches", { credentials: "same-origin", signal: controller.signal }),
        fetch("/api/panel/workspace", { credentials: "same-origin", signal: controller.signal }),
      ]);

      if (epoch !== sessionEpochRef.current || controller.signal.aborted) return;

      const allResponses = [
        ovRes,
        sesRes,
        leadRes,
        dealRes,
        stageRes,
        contactRes,
        memberRes,
        fieldRes,
        matchRes,
        wsRes,
      ];
      if (allResponses.some((r) => r.status === 401)) {
        handleUnauthorized();
        return;
      }

      if (!ovRes.ok || !sesRes.ok || !leadRes.ok) {
        setLoadError(d.loadError);
        return;
      }
      // Secondary data is optional for rendering, but a failure must still be visible.
      setPartialLoadError(allResponses.some((r) => !r.ok));

      const [ovJson, sesJson, leadJson] = await Promise.all([
        ovRes.json() as Promise<OverviewPayload>,
        sesRes.json() as Promise<{ ok: true; sessions: PanelSession[] }>,
        leadRes.json() as Promise<{ ok: true; leads: LeadRecord[] }>,
      ]);

      if (epoch !== sessionEpochRef.current || controller.signal.aborted) return;

      if (wsRes.ok) {
        const wsJson = (await wsRes.json()) as {
          ok: true;
          workspace: SalesWorkspace;
          actor?: { memberId: string | null; role: SalesMemberRole };
        };
        if (epoch === sessionEpochRef.current) {
          setWorkspace(wsJson.workspace);
          if (wsJson.actor) {
            setActorRole(wsJson.actor.role);
            setActorMemberId(wsJson.actor.memberId);
          }
        }
      }

      setOverview(ovJson);
      setTenantId(ovJson.tenantId);
      setSessions(sesJson.sessions);
      setLeads(leadJson.leads);

      if (dealRes.ok) {
        const dealJson = (await dealRes.json()) as { ok: true; deals: SalesDeal[] };
        if (epoch === sessionEpochRef.current) setDeals(dealJson.deals);
      }
      if (stageRes.ok) {
        const stageJson = (await stageRes.json()) as { ok: true; stages: SalesStage[] };
        if (epoch === sessionEpochRef.current) setStages(stageJson.stages);
      }
      if (contactRes.ok) {
        const contactJson = (await contactRes.json()) as { ok: true; contacts: SalesContact[] };
        if (epoch === sessionEpochRef.current) setContacts(contactJson.contacts);
      }
      if (memberRes.ok) {
        const memberJson = (await memberRes.json()) as { ok: true; members: SalesMember[] };
        if (epoch === sessionEpochRef.current) setMembers(memberJson.members);
      }
      if (fieldRes.ok) {
        const fieldJson = (await fieldRes.json()) as {
          ok: true;
          fields?: SalesFieldDef[];
          defs?: SalesFieldDef[];
        };
        if (epoch === sessionEpochRef.current) setFieldDefs(fieldJson.fields ?? fieldJson.defs ?? []);
      }
      if (matchRes.ok) {
        const matchJson = (await matchRes.json()) as { ok: true; matches: SalesPhoneMatch[] };
        if (epoch === sessionEpochRef.current) setPhoneMatches(matchJson.matches);
      }
    } catch (err) {
      if (epoch !== sessionEpochRef.current || controller.signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(d.loadError);
    } finally {
      if (epoch === sessionEpochRef.current && !controller.signal.aborted) {
        setLoadingData(false);
      }
    }
  }, [d.loadError, handleUnauthorized]);

  const refreshOverviewSilently = useCallback(async () => {
    const epoch = sessionEpochRef.current;
    try {
      const res = await fetch("/api/panel/overview", { credentials: "same-origin" });
      if (epoch !== sessionEpochRef.current) return;
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const ovJson = (await res.json()) as OverviewPayload;
        if (epoch !== sessionEpochRef.current) return;
        setOverview(ovJson);
      }
    } catch {
      // Ignore silent refresh error; primary state already updated.
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    const epoch = ++sessionEpochRef.current;
    const controller = new AbortController();
    async function checkSession() {
      // The session cookie is HttpOnly; only the server can check it. Skip the probe (and the
      // expected 401 in the console) when the login hint cookie says there is no session.
      if (!hasPanelSessionHint()) {
        clearSensitiveState();
        setAuthState("unauthenticated");
        return;
      }
      try {
        const res = await fetch("/api/panel/auth", {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (epoch !== sessionEpochRef.current || controller.signal.aborted) return;
        if (res.ok) {
          const data = (await res.json()) as { ok: true; tenantId: string };
          if (epoch !== sessionEpochRef.current || controller.signal.aborted) return;
          setTenantId(data.tenantId);
          setActiveTab(initialTab);
          setAuthState("authenticated");
          void loadPanelData();
        } else {
          clearSensitiveState();
          setAuthState("unauthenticated");
        }
      } catch (err) {
        if (epoch !== sessionEpochRef.current || controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        clearSensitiveState();
        setAuthState("unauthenticated");
      }
    }
    void checkSession();
    return () => {
      sessionEpochRef.current += 1;
      controller.abort();
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      clearSensitiveState();
      setAuthState("checking");
    };
  }, [clearSensitiveState, initialTab, loadPanelData]);

  useEffect(() => {
    if (authState === "unauthenticated") {
      router.replace(`/${lang}/login`);
    }
  }, [authState, lang, router]);

  async function handleSignOut() {
    sessionEpochRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setSigningOut(true);
    try {
      await fetch("/api/panel/auth", {
        method: "DELETE",
        credentials: "same-origin",
      });
    } finally {
      setSigningOut(false);
      clearSensitiveState();
      setAuthState("unauthenticated");
    }
  }

  function handleLeadCreated(lead: LeadRecord) {
    setLeads((prev) => [lead, ...prev.filter((l) => l.id !== lead.id)]);
    void refreshOverviewSilently();
  }

  function handleLeadUpdated(updated: LeadRecord) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    void refreshOverviewSilently();
  }

  function handleOpenInbox(leadId: string) {
    setSelectedInboxLeadId(leadId);
    setActiveTab("inbox");
  }

  function handleDealCreated(deal: SalesDeal, contact?: SalesContact) {
    setDeals((prev) => [deal, ...prev.filter((item) => item.id !== deal.id)]);
    if (contact) {
      setContacts((prev) => [contact, ...prev.filter((c) => c.id !== contact.id)]);
    }
  }

  function handleDealUpdated(updated: SalesDeal) {
    setDeals((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  function handleDealDeleted(dealId: string) {
    setDeals((prev) => prev.filter((item) => item.id !== dealId));
    if (selectedDealId === dealId) {
      setSelectedDealId(null);
    }
  }

  function handleOpenDeal(dealId: string) {
    setSelectedDealId(dealId);
    setActiveTab("deals");
  }

  function handleOpenContact(contactId: string) {
    setSelectedContactId(contactId);
    setActiveTab("contacts");
  }

  async function handleConfirmPhoneMatch(matchId: string) {
    const res = await fetch(`/api/panel/phone-matches/${encodeURIComponent(matchId)}/confirm`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!res.ok) {
      throw new Error("confirm_failed");
    }
    const data = (await res.json()) as {
      ok: true;
      match: { id: string; contactId: string; confirmedAt: string | null };
    };
    setPhoneMatches((prev) =>
      prev.map((m) => (m.id === data.match.id ? { ...m, confirmedAt: data.match.confirmedAt } : m))
    );
    setContacts((prev) =>
      prev.map((c) => (c.id === data.match.contactId ? { ...c, phoneVerified: true } : c))
    );
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (currentIdx + 1) % TAB_ORDER.length;
    else if (e.key === "ArrowLeft") nextIdx = (currentIdx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = TAB_ORDER.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      const nextTab = TAB_ORDER[nextIdx];
      setActiveTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  }

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-[#251744]">{d.loading}</p>
      </div>
    );
  }

  // All panel sign-ins go through the single, existing /login page.
  if (authState === "unauthenticated") {
    return null;
  }

  const otherLang: PanelLocale = lang === "az" ? "en" : "az";

  const tabMeta: Array<{ id: PanelTabId; label: string; count?: number }> = [
    { id: "overview", label: d.tabs.overview },
    { id: "deals", label: d.tabs.deals, count: deals.length },
    { id: "contacts", label: d.tabs.contacts, count: contacts.length },
    { id: "sessions", label: d.tabs.sessions, count: sessions.length },
    { id: "leads", label: d.tabs.leads, count: leads.length },
    { id: "inbox", label: d.tabs.inbox, count: overview?.totalMessages },
    { id: "channels", label: d.tabs.channels },
    { id: "ai", label: d.tabs.ai },
    { id: "plans", label: d.tabs.plans },
    { id: "settings", label: d.tabs.settings },
  ];

  const activeDeal = selectedDealId ? deals.find((item) => item.id === selectedDealId) ?? null : null;

  const activeTabButtonId = `${tabBaseId}-tab-${activeTab}`;
  const activePanelId = `${tabBaseId}-panel-${activeTab}`;

  const activeTabLabel = tabMeta.find((t) => t.id === activeTab)?.label ?? d.tabs.overview;
  const checklistStepsDone =
    (workspace?.name ? 1 : 0) + (leads.length > 0 ? 1 : 0) + (sessions.length > 0 ? 1 : 0) + (deals.length > 0 ? 1 : 0);
  const checklistPct = Math.round((checklistStepsDone / 4) * 100);
  const displayWorkspaceName = workspace?.name || tenantId || brand;
  const avatarInitials = displayWorkspaceName.slice(0, 2).toUpperCase();

  const goalTabs = ["overview", "inbox", "deals", "sessions", "inbox"] as const;
  return (
    <WorkspaceSetup key={tenantId} tenantId={tenantId} defaultCompany={workspace?.name} lang={lang} onFinish={(goal) => setActiveTab(goalTabs[goal] ?? "overview")}>
    <div
      className="crm-screen panel-workspace"
      data-settings={activeTab === "settings" ? "true" : undefined}
      data-collapsed={sidebarCollapsed ? "true" : undefined}
    >
      <a href="#main" className="skip-link">
        {skipToMain}
      </a>

      <header className="panel-workspace-header">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href={`/${lang}`} className="flex min-h-9 shrink-0 items-center gap-2 text-base font-bold tracking-tight md:hidden">
              <LogoMark />
              <span translate="no">{brand}</span>
            </Link>
            <span className="hidden text-sm font-semibold text-ink md:inline">
              {activeTabLabel}
            </span>
            <span className="rounded border border-brand/25 bg-brand/10 px-2 py-0.5 text-xs font-semibold text-pen">
              {d.badge}
            </span>
            {(workspace?.name || tenantId) && (
              <span className="hidden max-w-48 truncate rounded border border-line bg-bg px-2.5 py-0.5 text-xs font-medium text-muted sm:inline-block">
                {d.tenantLabel}: {workspace?.name || tenantId}
              </span>
            )}
          </div>

          <nav aria-label={d.navAria} className="flex flex-wrap items-center gap-2">
            <CopilotDrawer lang={lang} deals={deals} leads={leads} sessions={sessions} />
            <button
              type="button"
              onClick={() => void loadPanelData()}
              disabled={loadingData}
              className={buttonClass({
                variant: "secondary",
                size: "sm",
                className: "min-h-11 sm:min-h-9",
              })}
            >
              {loadingData ? d.refreshing : d.refresh}
            </button>

            <Link
              href={`/${otherLang}/panel`}
              hrefLang={otherLang}
              aria-label={`${d.switchLang}: ${otherLang.toUpperCase()}`}
              className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-2.5 py-1 text-sm font-semibold uppercase text-muted transition-[color,border-color] hover:border-ink hover:text-ink sm:min-h-9"
            >
              {otherLang}
            </Link>

            <Link
              href={`/${lang}`}
              className="hidden min-h-9 items-center rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-brand md:inline-flex"
            >
              {d.backToSite}
            </Link>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-danger transition-colors hover:border-danger sm:min-h-9"
            >
              {signingOut ? d.signingOut : d.signOut}
            </button>
          </nav>
        </div>
      </header>
      <aside className="panel-workspace-sidebar">
            <div className="panel-rail-top">
              <Link
                href={`/${lang}`}
                aria-label={brand}
                title={brand}
                className="panel-rail-brand-link"
              >
                <LogoMark />
                <span className="panel-rail-brand-text truncate" translate="no">
                  {brand}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="panel-rail-collapse-btn"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
                  <path d="M7.5 3.5v13" />
                </svg>
              </button>
            </div>

            <div
              role="tablist"
              aria-label={d.tabs.ariaLabel}
              className="panel-workspace-tabs"
            >
              {tabMeta.map((tab, idx) => {
                const isSelected = activeTab === tab.id;
                const tabDomId = `${tabBaseId}-tab-${tab.id}`;
                const panelDomId = `${tabBaseId}-panel-${tab.id}`;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    id={tabDomId}
                    type="button"
                    role="tab"
                    title={tab.label}
                    aria-selected={isSelected}
                    aria-controls={panelDomId}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={isSelected ? "crm-tab-selected" : undefined}
                  >
                    <svg className="panel-rail-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={PANEL_TAB_ICONS[tab.id]} /></svg>
                    <span className="panel-rail-label">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="panel-rail-count tabular-nums">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Kommo 2026 Pinned Integrations */}
            <div className="panel-rail-pinned">
              <p className="panel-rail-section-label">
                {lang === "en" ? "Pinned integrations" : "Sabitlənmiş inteqrasiyalar"}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("channels")}
                title="Instagram"
                className="panel-rail-pinned-btn"
              >
                <span
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <rect x="4" y="4" width="16" height="16" rx="4" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </span>
                <span className="panel-rail-pinned-label truncate">Instagram</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("channels")}
                title="WhatsApp Business"
                className="panel-rail-pinned-btn"
              >
                <span
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.5-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z" />
                  </svg>
                </span>
                <span className="panel-rail-pinned-label truncate">WhatsApp Business</span>
              </button>
            </div>

            {/* Kommo 2026 Onboarding Progress Card */}
            <button
              type="button"
              onClick={() => setActiveTab(leads.length === 0 ? "leads" : sessions.length === 0 ? "sessions" : "channels")}
              className="panel-rail-checklist"
            >
              <span className="panel-rail-checklist-ring tabular-nums">{checklistPct}%</span>
              <span className="truncate">
                {lang === "en" ? "Onboarding progress" : "Başlanğıc addımları"}
              </span>
            </button>

            {/* Kommo 2026 User Profile Footer */}
            <div className="panel-rail-footer">
              <span className="panel-rail-avatar" aria-hidden="true">
                {avatarInitials}
              </span>
              <div className="panel-rail-user-meta min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{displayWorkspaceName}</p>
                <p className="truncate text-[11px] text-muted">{tenantId || "workspace"}</p>
              </div>
            </div>
      </aside>

      <main id="main" tabIndex={-1} className="min-w-0 w-full px-4 py-4 sm:px-6 sm:py-5">
        {loadError ? (
          <div className="panel-register flex flex-col items-start gap-3 p-6" role="alert">
            <p className="font-medium text-danger">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadPanelData()}
              className={buttonClass({ size: "sm", className: "min-h-11" })}
            >
              {d.retry}
            </button>
          </div>
        ) : !overview && loadingData ? (
          <div className="panel-card p-8 text-center text-muted" role="status" aria-live="polite">
            {d.loading}
          </div>
        ) : (
          <>
          {partialLoadError ? (
            <div className="panel-register mb-4 flex flex-wrap items-center gap-3 p-4" role="status">
              <p className="font-medium text-danger">{d.loadError}</p>
              <button
                type="button"
                onClick={() => void loadPanelData()}
                className={buttonClass({ size: "sm", className: "min-h-11" })}
              >
                {d.retry}
              </button>
            </div>
          ) : null}
          {activeTab !== "plans" ? (
            <TrialBanner lang={lang} onOpenPlans={() => setActiveTab("plans")} />
          ) : null}
          <div
            role="tabpanel"
            id={activePanelId}
            aria-labelledby={activeTabButtonId}
            tabIndex={0}
          >
            {activeTab === "overview" && overview && (
              <OverviewTab
                overview={overview}
                lang={lang}
                d={d}
                onNavigate={(t) => setActiveTab(t)}
              />
            )}

            {activeTab === "deals" &&
              (activeDeal ? (
                <DealDetail
                  key={activeDeal.id}
                  deal={activeDeal}
                  stages={stages}
                  members={members}
                  fieldDefs={fieldDefs}
                  actorRole={actorRole}
                  lang={lang}
                  d={d}
                  onBack={() => setSelectedDealId(null)}
                  onDealUpdated={handleDealUpdated}
                  onDealDeleted={handleDealDeleted}
                  onOpenContact={handleOpenContact}
                  onUnauthorized={handleUnauthorized}
                />
              ) : (
                <DealList
                  deals={deals}
                  stages={stages}
                  contacts={contacts}
                  members={members}
                  currentMemberId={actorMemberId}
                  currency={workspace?.currency ?? "AZN"}
                  lang={lang}
                  d={d}
                  onDealCreated={handleDealCreated}
                  onDealUpdated={handleDealUpdated}
                  onOpenDeal={handleOpenDeal}
                  onUnauthorized={handleUnauthorized}
                />
              ))}

            {activeTab === "contacts" && (
              <ContactDetail
                contacts={contacts}
                deals={deals}
                stages={stages}
                phoneMatches={phoneMatches}
                selectedContactId={selectedContactId}
                lang={lang}
                d={d}
                onSelectContact={(id) => setSelectedContactId(id)}
                onContactCreated={(c) =>
                  setContacts((prev) => [c, ...prev.filter((item) => item.id !== c.id)])
                }
                onConfirmPhoneMatch={handleConfirmPhoneMatch}
                onOpenDeal={handleOpenDeal}
                onUnauthorized={handleUnauthorized}
              />
            )}

            {activeTab === "sessions" && (
              <SessionsTab
                sessions={sessions}
                lang={lang}
                d={d}
                onRefresh={loadPanelData}
                onUnauthorized={handleUnauthorized}
              />
            )}

            {activeTab === "leads" && (
              <LeadsTab
                leads={leads}
                lang={lang}
                d={d}
                onLeadCreated={handleLeadCreated}
                onLeadUpdated={handleLeadUpdated}
                onOpenInbox={handleOpenInbox}
                onUnauthorized={handleUnauthorized}
              />
            )}

            {activeTab === "inbox" && (
              <InboxTab
                leads={leads}
                selectedLeadId={selectedInboxLeadId}
                onSelectLead={(id) => setSelectedInboxLeadId(id)}
                onLeadUpdated={handleLeadUpdated}
                onMessageSent={() => void refreshOverviewSilently()}
                phoneMatches={phoneMatches}
                onConfirmPhoneMatch={handleConfirmPhoneMatch}
                lang={lang}
                d={d}
                onUnauthorized={handleUnauthorized}
                onOpenChannels={() => setActiveTab("channels")}
              />
            )}

            {activeTab === "settings" && (
              !workspace && loadingData ? (
                <p role="status">{d.loading}</p>
              ) : (
                <PanelSettings
                  key={JSON.stringify([tenantId, actorMemberId])}
                  lang={lang}
                  tenantId={tenantId}
                  memberId={actorMemberId}
                  memberName={members.find((member) => member.id === actorMemberId)?.name}
                  onNavigate={setActiveTab}
                >
                  {(section) => (
                    <TeamStageTab
                      section={section}
                      workspace={workspace}
                      stages={stages}
                      fieldDefs={fieldDefs}
                      members={members}
                      actorRole={actorRole}
                      d={d}
                      onWorkspaceUpdated={setWorkspace}
                      onStagesChanged={setStages}
                      onFieldsChanged={setFieldDefs}
                      onMembersChanged={setMembers}
                      onUnauthorized={handleUnauthorized}
                    />
                  )}
                </PanelSettings>
              )
            )}

            {activeTab === "channels" && <ChannelsTab lang={lang} d={d} />}
            {activeTab === "ai" && <AiTab lang={lang} d={d} />}
            {activeTab === "plans" && <PlansTab lang={lang} d={d} />}
          </div>
          </>
        )}
      </main>
    </div>
    </WorkspaceSetup>
  );
}
