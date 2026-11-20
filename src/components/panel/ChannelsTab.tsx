"use client";

import { useState } from "react";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/ChannelIcons";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict } from "./types";

type Channel = {
  id: string;
  name: string;
  webhook: string;
  connected: boolean;
  Icon: typeof WhatsAppIcon;
};

const CHANNELS: Channel[] = [
  { id: "ch_wa", Icon: WhatsAppIcon, name: "WhatsApp", webhook: "https://panelim.az/api/channels/whatsapp", connected: true },
  { id: "ch_ig", Icon: InstagramIcon, name: "Instagram", webhook: "https://panelim.az/api/channels/instagram", connected: false },
  { id: "ch_tg", Icon: TelegramIcon, name: "Telegram", webhook: "https://panelim.az/api/channels/telegram", connected: true },
];

export function ChannelsTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const [active, setActive] = useState<Map<string, boolean>>(new Map(CHANNELS.map((c) => [c.id, c.connected])));
  const [copyFeedback, setCopyFeedback] = useState<{ id: string; ok: boolean } | null>(null);
  const channels = d.channels;
  const t = (key: string) => (channels as Record<string, string>)[key];

  async function copyWebhook(channel: Channel) {
    try {
      await navigator.clipboard.writeText(channel.webhook);
      setCopyFeedback({ id: channel.id, ok: true });
    } catch {
      setCopyFeedback({ id: channel.id, ok: false });
    }
  }

  function toggle(id: string) {
    setActive((prev) => {
      const next = new Map(prev);
      next.set(id, !next.get(id));
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <header className="panel-card crm-section-heading">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>

      <div className="grid gap-4">
        {CHANNELS.map((c) => (
          <div key={c.id} className="panel-card p-4 border border-line rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0"><c.Icon size={36} /></span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{c.name}</p>
                  <p className="text-xs text-muted [overflow-wrap:anywhere]">{c.webhook}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border ${
                    active.get(c.id)
                      ? "border-stamp/40 bg-stamp/10 text-stamp"
                      : "border-line bg-bg text-ink"
                  }`}
                >
                  {active.get(c.id) ? t("connected") : t("disconnected")}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-pressed={active.get(c.id)}
                  className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
                >
                  {active.get(c.id) ? t("disconnect") : t("connect")}
                </button>
                <button
                  type="button"
                  onClick={() => void copyWebhook(c)}
                  className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
                >
                  {t("webhookLabel")}
                </button>
              </div>
            </div>
            <div role="status" className="text-xs text-muted">
              {copyFeedback?.id === c.id && (
                <p className="mt-2">
                  {copyFeedback.ok ? "Kopyalandı." : "Ünvanı seçib əl ilə kopyalayın."}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
