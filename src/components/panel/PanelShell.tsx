"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { buttonClass } from "@/components/ui/button";
import { PanelSettings } from "./PanelSettings";
import { WorkspaceSetup } from "./WorkspaceSetup";
import { ChannelsTab } from "./ChannelsTab";
import { AiTab } from "./AiTab";
import { PlansTab } from "./PlansTab";
import { ContactDetail } from "./ContactDetail";
import { DealDetail } from "./DealDetail";
import { DealList } from "./DealList";
import { InboxTab } from "./InboxTab";
import { LeadsTab } from "./LeadsTab";
import { LoginGate } from "./LoginGate";
import { OverviewTab } from "./OverviewTab";
import { SessionsTab } from "./SessionsTab";
import { TeamStageTab } from "./TeamStageTab";
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
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") === "settings" ? "settings" : "overview";
  const testLogin = searchParams.get("test-login");
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
  const [signingOut, setSigningOut] = useState(false);

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
  }, []);

  const handleUnauthorized = useCallback(() => {
    sessionEpochRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearSensitiveState();
    setAuthState("unauthenticated");
    setAuthNotice(d.unauthorizedNotice);
  }, [clearSensitiveState, d.unauthorizedNotice]);

  const loadPanelData = useCallback(async () => {
    const epoch = sessionEpochRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingData(true);
    setLoadError(null);
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

      const [ovJson, sesJson, leadJson] = await Promise.all([
        ovRes.json() as Promise<OverviewPayload>,
        sesRes.json() as Promise<{ ok: true; sessions: PanelSession[] }>,
        leadRes.json() as Promise<{ ok: true; leads: LeadRecord[] }>,
      ]);

      if (epoch !== sessionEpochRef.current || controller.signal.aborted) return;

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
      if (testLogin === "1") {
        setTenantId("test-tenant-1");
        setActiveTab(initialTab);
        setAuthState("authenticated");
        void loadPanelData();
        return;
      }
      // The session cookie is HttpOnly; only the server can check it.
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
  }, [clearSensitiveState, initialTab, loadPanelData, testLogin]);

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
      setAuthNotice(null);
      clearSensitiveState();
      setAuthState("unauthenticated");
    }
  }

  function handleAuthenticated(nextTenantId: string) {
    setTenantId(nextTenantId);
    setActiveTab(initialTab);
    setAuthNotice(null);
    setAuthState("authenticated");
    void loadPanelData();
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
      <div className="crm-screen flex min-h-screen items-center justify-center px-4">
        <div className="panel-register px-6 py-5 text-center" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-muted">{d.loading}</p>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <>
        <a href="#main" className="skip-link">
          {skipToMain}
        </a>
        <LoginGate
          lang={lang}
          brand={brand}
          d={d}
          notice={authNotice}
          onAuthenticated={handleAuthenticated}
        />
      </>
    );
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

  const goalTabs = ["inbox", "deals", "sessions", "overview"] as const;
  return (
    <WorkspaceSetup key={tenantId} tenantId={tenantId} lang={lang} onFinish={(goal) => setActiveTab(goalTabs[goal] ?? "overview")}>
    <div className="crm-screen panel-workspace" data-settings={activeTab === "settings" ? "true" : undefined}>
      <a href="#main" className="skip-link">
        {skipToMain}
      </a>

      <header className="panel-workspace-header border-b border-line bg-bg">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href={`/${lang}`} className="flex min-h-11 shrink-0 items-center gap-2 text-lg font-bold">
              <LogoMark />
              <span translate="no">{brand}</span>
            </Link>
            <span className="rounded bg-cover px-2 py-0.5 text-xs font-semibold text-white">
              {d.badge}
            </span>
            {tenantId && (
              <span className="hidden truncate rounded border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink sm:inline-block">
                {d.tenantLabel}: {tenantId}
              </span>
            )}
          </div>

          <nav aria-label={d.navAria} className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadPanelData()}
              disabled={loadingData}
              className={buttonClass({
                variant: "secondary",
                size: "sm",
                className: "min-h-11",
              })}
            >
              {loadingData ? d.refreshing : d.refresh}
            </button>

            <Link
              href={`/${otherLang}/panel`}
              hrefLang={otherLang}
              aria-label={`${d.switchLang}: ${otherLang.toUpperCase()}`}
              className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-2.5 py-1 text-sm font-semibold uppercase text-muted transition-[color,border-color] hover:border-ink hover:text-ink"
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
                    title={activeTab === "settings" ? tab.label : undefined}
                    aria-selected={isSelected}
                    aria-controls={panelDomId}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={`inline-flex min-h-11 items-center justify-start gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors ${
                      isSelected
                        ? "crm-tab-selected"
                        : "border-transparent bg-transparent text-muted hover:border-line hover:bg-bg hover:text-ink"
                    }`}
                  >
                    {activeTab === "settings" && <svg className="panel-rail-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={PANEL_TAB_ICONS[tab.id]} /></svg>}
                    <span className="panel-rail-label">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`panel-rail-count rounded px-1.5 py-0.5 text-xs tabular-nums ${
                          isSelected
                            ? "border border-line bg-surface text-ink"
                            : "border border-line bg-bg text-ink"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
      </aside>

      <main id="main" tabIndex={-1} className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8">
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
        )}
      </main>
    </div>
    </WorkspaceSetup>
  );
}
