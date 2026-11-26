"use client";

import { useEffect, useState } from "react";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/ChannelIcons";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict } from "./types";

type ChannelId = "whatsapp" | "instagram" | "telegram";
type Status = { channel: ChannelId; connected: boolean; accounts: number; webhook: string };

const META: Record<ChannelId, { name: string; Icon: typeof WhatsAppIcon }> = {
  whatsapp: { name: "WhatsApp", Icon: WhatsAppIcon },
  instagram: { name: "Instagram", Icon: InstagramIcon },
  telegram: { name: "Telegram", Icon: TelegramIcon },
};

export function ChannelsTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const [statuses, setStatuses] = useState<Status[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ id: string; ok: boolean } | null>(null);
  const channels = d.channels;
  const t = (key: string) => (channels as Record<string, string>)[key];

  useEffect(() => {
    let alive = true;
    fetch("/api/panel/channels", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { channels: Status[] }) => alive && setStatuses(body.channels))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  async function copyWebhook(s: Status) {
    try {
      await navigator.clipboard.writeText(s.webhook);
      setCopyFeedback({ id: s.channel, ok: true });
    } catch {
      setCopyFeedback({ id: s.channel, ok: false });
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
          {lang === "en" ? "Could not load channel status." : "Kanal vəziyyəti yüklənmədi."}
        </p>
      )}
      <div className="grid gap-4">
        {(statuses ?? []).map((st) => {
          const { name, Icon } = META[st.channel];
          return (
            <div key={st.channel} className="panel-card p-4 border border-line rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0"><Icon size={36} /></span>
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
                    {st.connected ? t("connected") : t("disconnected")}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyWebhook(st)}
                    className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
                  >
                    {t("webhookLabel")}
                  </button>
                </div>
              </div>
              {!st.connected && (
                <p className="mt-2 text-xs text-muted">
                  {lang === "en"
                    ? "Not connected. Channel credentials are set by the Panelim team during onboarding."
                    : "Qoşulmayıb. Kanal məlumatları qoşulma zamanı Panelim komandası tərəfindən təyin edilir."}
                </p>
              )}
              <div role="status" className="text-xs text-muted">
                {copyFeedback?.id === st.channel && (
                  <p className="mt-2">
                    {copyFeedback.ok
                      ? lang === "en"
                        ? "Copied."
                        : "Kopyalandı."
                      : lang === "en"
                        ? "Select the URL and copy it manually."
                        : "Ünvanı seçib əl ilə kopyalayın."}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
