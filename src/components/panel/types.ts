import type az from "@/app/[lang]/dictionaries/az.json";

export type PanelDict = typeof az.panel;
export type PanelLocale = "az" | "en";

export type LeadStage = "new" | "contacted" | "trial_booked" | "paid" | "lost";
export type LeadSource = "telegram" | "whatsapp" | "instagram" | "web" | "manual";
export type MessageSender = "student" | "ai" | "staff";
export type MessageDirection = "in" | "out";

export const LEAD_STAGES: readonly LeadStage[] = [
  "new",
  "contacted",
  "trial_booked",
  "paid",
  "lost",
] as const;

export const LEAD_SOURCES: readonly LeadSource[] = [
  "telegram",
  "whatsapp",
  "instagram",
  "web",
  "manual",
] as const;

export type PanelSessionSummary = {
  id: string;
  courseId: string;
  startsAt: string;
  capacity: number;
  taken: number;
  seatsLeft: number;
};

export type PanelEnrollment = {
  id: string;
  sessionId: string;
  name: string;
  phone: string;
  createdAt: string;
};

export type PanelSession = PanelSessionSummary & {
  enrollments: PanelEnrollment[];
};

export type OverviewAnalytics = {
  totalEvents: number;
  pageViews: number;
  ctaClicks: number;
  leadFormStarted: number;
  leadFormSubmitted: number;
  leadFormFailed: number;
  byLocale: { az: number; en: number };
  byCtaLocation: Record<string, number>;
  byUtmSource: Record<string, number>;
  byExperiment: Record<string, { views: number; ctaClicks: number; leads: number }>;
};

export type OverviewPayload = {
  ok: true;
  tenantId: string;
  sessions: PanelSessionSummary[];
  leadsByStage: Record<LeadStage, number>;
  totalLeads: number;
  totalEnrollments: number;
  totalMessages: number;
  analytics: OverviewAnalytics;
};

export type LeadRecord = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  source: LeadSource;
  stage: LeadStage;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  tenantId: string;
  leadId: string;
  channel: LeadSource;
  direction: MessageDirection;
  sender: MessageSender;
  body: string;
  createdAt: string;
};

export type PanelTabId =
  | "overview"
  | "sessions"
  | "leads"
  | "inbox"
  | "deals"
  | "contacts"
  | "channels"
  | "ai"
  | "plans"
  | "settings";

export type SalesMemberRole = "owner" | "manager" | "operator";
export type SalesStageKind = "open" | "won" | "lost";
export type SalesFieldKind = "text" | "number" | "date" | "boolean";

export type SalesWorkspace = {
  tenantId: string;
  name: string;
  locale: PanelLocale;
  timezone: string;
  currency: string;
  createdAt: string;
};

export type SalesMember = {
  id: string;
  tenantId: string;
  name: string;
  role: SalesMemberRole;
  createdAt: string;
};

export type SalesStage = {
  id: string;
  tenantId: string;
  name: string;
  position: number;
  kind: SalesStageKind;
};

export type SalesContact = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  createdAt: string;
};

export type SalesDeal = {
  id: string;
  tenantId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  stageId: string;
  assigneeId: string | null;
  title: string;
  amountMinor: number;
  currency: string;
  source: LeadSource;
  createdAt: string;
  updatedAt: string;
};

export type SalesTask = {
  id: string;
  tenantId: string;
  dealId: string;
  assigneeId: string | null;
  title: string;
  body: string;
  status: "open" | "done" | "canceled";
  dueAt: string | null;
  createdAt: string;
};

export type SalesNote = {
  id: string;
  tenantId: string;
  dealId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type SalesFieldDef = {
  id: string;
  tenantId: string;
  name: string;
  kind: SalesFieldKind;
  required: boolean;
  position: number;
};

export type SalesDealFieldValue = {
  fieldId: string;
  value: string;
};

export type SalesPhoneMatch = {
  id: string;
  tenantId: string;
  contactId: string;
  contactName: string;
  channel: string;
  externalUserId: string;
  phoneNormalized: string;
  confirmedAt: string | null;
  createdAt: string;
};

export type SalesDealMessage = {
  id: string;
  tenantId: string;
  threadId: string;
  channel: string;
  direction: MessageDirection;
  sender: string;
  body: string;
  status: string;
  createdAt: string;
};

export type SalesTimelineEntry =
  | {
      kind: "message";
      id: string;
      at: string;
      channel: string;
      direction: string;
      sender: string;
      body: string;
      status: string;
    }
  | {
      kind: "event";
      id: string;
      at: string;
      eventType: string;
      actorId: string | null;
      payload: Record<string, unknown>;
    };

export function localizeStageName(stage: Pick<SalesStage, "id" | "name">, d: PanelDict): string {
  if (stage.id in d.stages) {
    return d.stages[stage.id as LeadStage];
  }
  return stage.name;
}

export function formatMoneyMinor(amountMinor: number, currency = "AZN"): string {
  const safeCurrency = currency || "AZN";
  const major = (amountMinor / 100).toFixed(amountMinor % 100 === 0 ? 0 : 2);
  return `${major} ${safeCurrency}`;
}

export function stageKindBadgeClass(kind: SalesStageKind): string {
  switch (kind) {
    case "won":
      return "border-stamp/40 bg-stamp/10 text-stamp";
    case "lost":
      return "border-danger/30 bg-danger/10 text-danger";
    case "open":
    default:
      return "border-line bg-bg text-ink";
  }
}

export function formatPanelDateTime(iso: string, lang: PanelLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang === "az" ? "az-AZ" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

export function stageBadgeClass(stage: LeadStage): string {
  switch (stage) {
    case "paid":
      return "border-stamp/40 bg-stamp/10 text-stamp";
    case "trial_booked":
      return "border-cover/30 bg-marker text-cover";
    case "contacted":
      return "border-brand/30 bg-brand/10 text-pen";
    case "lost":
      return "border-danger/30 bg-danger/10 text-danger";
    case "new":
    default:
      return "border-line bg-bg text-ink";
  }
}
