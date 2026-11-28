"use client";

import { useCallback, useEffect, useState } from "react";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/ChannelIcons";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict } from "./types";

type ChannelId = "whatsapp" | "instagram" | "telegram";
type Status = { channel: ChannelId; connected: boolean; accounts: number; webhook: string };
type ConnectionItem = {
  id: string;
  channel: ChannelId;
  account: string;
  displayName: string;
  active: boolean;
  automationEnabled: boolean;
  source: "db" | "env";
  hasToken: boolean;
  webhook: string;
};

const META: Record<ChannelId, { name: string; Icon: typeof WhatsAppIcon }> = {
  whatsapp: { name: "WhatsApp", Icon: WhatsAppIcon },
  instagram: { name: "Instagram", Icon: InstagramIcon },
  telegram: { name: "Telegram", Icon: TelegramIcon },
};

const COPY = {
  az: {
    connectBtn: "Kanal qoş",
    cancelBtn: "Ləğv et",
    saveBtn: "Yadda saxla və qoş",
    savingBtn: "Qoşulur...",
    loadError: "Kanal vəziyyəti yüklənmədi.",
    copied: "Kopyalandı.",
    copyFail: "Ünvanı seçib əl ilə kopyalayın.",
    displayName: "Kanal adı (məs: Əsas satış xətti)",
    accountLabel: {
      telegram: "Bot ID (boş buraxsanız tokendən avtomatik götürülür)",
      whatsapp: "WhatsApp Phone Number ID",
      instagram: "Instagram Business Account ID",
    },
    tokenLabel: {
      telegram: "Telegram Bot Token (@BotFather)",
      whatsapp: "Meta Permanent Access Token",
      instagram: "Instagram / Meta Access Token",
    },
    hint: {
      telegram: "Bot tokenini daxil edin — webhook Telegram API üzərindən avtomatik quraşdırılacaq.",
      whatsapp: "Meta Developer Console → WhatsApp → API Setup bölməsindən Phone Number ID və Access Token daxil edin, sonra yuxarıdakı Webhook URL-ni yapışdırın.",
      instagram: "Meta Developer Console → Instagram Messaging bölməsindən Account ID və Token daxil edib Webhook URL-ni təsdiqləyin.",
    },
    autoReplyLabel: "Pani AI avtomatik cavab",
    aiOn: "Pani AI: Aktiv",
    aiOff: "Pani AI: Söndürülüb",
    disconnectBtn: "Ayır",
    connectedSaved: "Kanal uğurla qoşuldu.",
    webhookAutoOk: "Telegram webhook avtomatik qeydiyyatdan keçdi.",
    webhookAutoWarn: "Kanal yadda saxlanıldı, lakin Telegram webhook qeydiyyatı xəta verdi:",
    saveError: "Kanalı yadda saxlamaq mümkün olmadı. Məlumatları yoxlayın.",
    conflictError: "Bu hesab ID-si artıq başqa iş sahəsinə qoşulub.",
    envManaged: "Env ilə idarə olunur",
    noAccounts: "Hələ hesab qoşulmayıb. «Kanal qoş» düyməsi ilə özünüz qoşun.",
  },
  en: {
    connectBtn: "Connect channel",
    cancelBtn: "Cancel",
    saveBtn: "Save & connect",
    savingBtn: "Connecting...",
    loadError: "Could not load channel status.",
    copied: "Copied.",
    copyFail: "Select the URL and copy it manually.",
    displayName: "Display name (e.g. Main Sales Line)",
    accountLabel: {
      telegram: "Bot ID (optional — auto-detected from token)",
      whatsapp: "WhatsApp Phone Number ID",
      instagram: "Instagram Business Account ID",
    },
    tokenLabel: {
      telegram: "Telegram Bot Token (@BotFather)",
      whatsapp: "Meta Permanent Access Token",
      instagram: "Instagram / Meta Access Token",
    },
    hint: {
      telegram: "Paste your @BotFather token — the webhook will be registered automatically via Telegram Bot API.",
      whatsapp: "Copy your Phone Number ID and Permanent Access Token from Meta Developer Console, then configure the Webhook URL above.",
      instagram: "Enter your Instagram Business Account ID and Meta Access Token, then subscribe to the Webhook URL above.",
    },
    autoReplyLabel: "Enable Pani AI auto-reply on this channel",
    aiOn: "Pani AI: On",
    aiOff: "Pani AI: Off",
    disconnectBtn: "Disconnect",
    connectedSaved: "Channel connected successfully.",
    webhookAutoOk: "Telegram webhook registered automatically.",
    webhookAutoWarn: "Saved, but Telegram webhook registration returned:",
    saveError: "Could not save channel. Please verify your token and account ID.",
    conflictError: "This channel account ID is already connected to another workspace.",
    envManaged: "Managed via env",
    noAccounts: "Not connected yet. Click «Connect channel» to link your account directly.",
  },
} as const;

export function ChannelsTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const c = COPY[lang];
  const [statuses, setStatuses] = useState<Status[] | null>(null);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ id: string; ok: boolean } | null>(null);
  const [editingChannel, setEditingChannel] = useState<ChannelId | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [account, setAccount] = useState("");
  const [token, setToken] = useState("");
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const channels = d.channels;
  const t = (key: string) => (channels as Record<string, string>)[key];

  const reloadChannels = useCallback(async () => {
    try {
      const r = await fetch("/api/panel/channels", { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) throw new Error(String(r.status));
      const body = (await r.json()) as { channels: Status[]; connections?: ConnectionItem[] };
      setStatuses(body.channels);
      setConnections(body.connections ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/panel/channels", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { channels: Status[]; connections?: ConnectionItem[] }) => {
        if (!alive) return;
        setStatuses(body.channels);
        setConnections(body.connections ?? []);
        setLoadError(false);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function copyWebhook(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback({ id, ok: true });
    } catch {
      setCopyFeedback({ id, ok: false });
    }
  }

  function openConnectForm(ch: ChannelId) {
    setEditingChannel(editingChannel === ch ? null : ch);
    setDisplayName("");
    setAccount("");
    setToken("");
    setAutomationEnabled(true);
    setFeedback(null);
  }

  async function handleConnect(e: React.FormEvent<HTMLFormElement>, ch: ChannelId) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/panel/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          channel: ch,
          account: account.trim(),
          displayName: displayName.trim(),
          token: token.trim(),
          automationEnabled,
          registerWebhook: ch === "telegram",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        channels?: Status[];
        connections?: ConnectionItem[];
        webhookRegistered?: boolean;
        webhookError?: string;
      } | null;

      if (res.ok && data?.ok) {
        if (data.channels) setStatuses(data.channels);
        if (data.connections) setConnections(data.connections);
        setEditingChannel(null);
        setToken("");
        setAccount("");
        setDisplayName("");
        if (ch === "telegram") {
          setFeedback({
            kind: "ok",
            text: data.webhookRegistered
              ? `${c.connectedSaved} ${c.webhookAutoOk}`
              : `${c.webhookAutoWarn} ${data.webhookError ?? ""}`.trim(),
          });
        } else {
          setFeedback({ kind: "ok", text: c.connectedSaved });
        }
        return;
      }
      if (res.status === 409) {
        setFeedback({ kind: "error", text: c.conflictError });
      } else {
        setFeedback({ kind: "error", text: c.saveError });
      }
    } catch {
      setFeedback({ kind: "error", text: c.saveError });
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutomation(conn: ConnectionItem) {
    setBusyId(conn.id);
    try {
      const res = await fetch(`/api/panel/channels/${encodeURIComponent(conn.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ automationEnabled: !conn.automationEnabled }),
      });
      if (res.ok) await reloadChannels();
    } finally {
      setBusyId(null);
    }
  }

  async function disconnectChannel(conn: ConnectionItem) {
    setBusyId(conn.id);
    try {
      const res = await fetch(`/api/panel/channels/${encodeURIComponent(conn.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) await reloadChannels();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="panel-card crm-section-heading">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>

      {loadError && (
        <p role="alert" className="text-sm text-margin">
          {c.loadError}
        </p>
      )}

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`panel-card p-3 text-sm font-medium border rounded-xl ${
            feedback.kind === "ok"
              ? "border-stamp/40 bg-stamp/10 text-ink"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-4">
        {(statuses ?? []).filter((st) => st.channel === "whatsapp").map((st) => {
          const { name, Icon } = META[st.channel];
          const chConnections = connections.filter((item) => item.channel === st.channel && item.active);
          const isEditing = editingChannel === st.channel;

          return (
            <div key={st.channel} className="panel-card p-4 border border-line rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0">
                    <Icon size={36} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="text-xs text-muted [overflow-wrap:anywhere]">{st.webhook}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border ${
                      st.connected ? "border-stamp/40 bg-stamp/10 text-stamp" : "border-line bg-bg text-ink"
                    }`}
                  >
                    {st.connected ? `${t("connected")} (${st.accounts})` : t("disconnected")}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyWebhook(st.channel, st.webhook)}
                    className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
                  >
                    {t("webhookLabel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openConnectForm(st.channel)}
                    className={buttonClass({ variant: isEditing ? "secondary" : "primary", size: "sm", className: "min-h-11" })}
                  >
                    {isEditing ? c.cancelBtn : c.connectBtn}
                  </button>
                </div>
              </div>

              {chConnections.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {chConnections.map((conn) => (
                    <div
                      key={conn.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-bg px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {conn.displayName} <span className="font-normal text-muted">({conn.account})</span>
                        </p>
                        <p className="text-muted [overflow-wrap:anywhere]">{conn.webhook}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {conn.source === "db" ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === conn.id}
                              onClick={() => void toggleAutomation(conn)}
                              className={`rounded-md border px-2.5 py-1.5 font-semibold ${
                                conn.automationEnabled
                                  ? "border-stamp/40 bg-stamp/10 text-stamp"
                                  : "border-line bg-surface text-muted"
                              }`}
                            >
                              {conn.automationEnabled ? c.aiOn : c.aiOff}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === conn.id}
                              onClick={() => void disconnectChannel(conn)}
                              className="rounded-md border border-danger/30 bg-surface px-2.5 py-1.5 font-semibold text-danger hover:bg-danger/10"
                            >
                              {c.disconnectBtn}
                            </button>
                          </>
                        ) : (
                          <span className="rounded-md border border-line bg-surface px-2 py-1 text-muted">
                            {c.envManaged}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isEditing && <p className="text-xs text-muted">{c.noAccounts}</p>
              )}

              {isEditing && (
                <form
                  onSubmit={(e) => void handleConnect(e, st.channel)}
                  className="mt-2 space-y-3 rounded-xl border border-line bg-bg p-4"
                >
                  <p className="text-xs text-muted">{c.hint[st.channel]}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1 text-xs font-semibold text-ink">
                      <span>{c.displayName}</span>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={120}
                        placeholder={name}
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-ink"
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-ink">
                      <span>{c.accountLabel[st.channel]}</span>
                      <input
                        type="text"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        required={st.channel !== "telegram"}
                        maxLength={128}
                        placeholder={st.channel === "telegram" ? "123456789" : "109876543210987"}
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-ink"
                      />
                    </label>
                  </div>
                  <label className="block space-y-1 text-xs font-semibold text-ink">
                    <span>{c.tokenLabel[st.channel]}</span>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                      minLength={10}
                      maxLength={1024}
                      autoComplete="off"
                      placeholder="••••••••••••"
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-ink"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={automationEnabled}
                      onChange={(e) => setAutomationEnabled(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    {c.autoReplyLabel}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className={buttonClass({ variant: "primary", size: "sm", className: "min-h-11" })}
                    >
                      {saving ? c.savingBtn : c.saveBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingChannel(null)}
                      className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
                    >
                      {c.cancelBtn}
                    </button>
                  </div>
                </form>
              )}

              <div role="status" className="text-xs text-muted">
                {copyFeedback?.id === st.channel && (
                  <p>{copyFeedback.ok ? c.copied : c.copyFail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
