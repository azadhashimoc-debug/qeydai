import { validateAnalyticsEvent, type AnalyticsEvent } from "./events";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;

  const validated = validateAnalyticsEvent(event);
  if (!validated.ok) return;

  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: validated.value.event, ...validated.value.props });
  } catch {
    // Ignore storage/CSP restrictions on dataLayer
  }

  const payload = JSON.stringify(validated.value);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
      if (sent) return;
    }
    if (typeof fetch === "function") {
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never let analytics disrupt user flows
  }
}
