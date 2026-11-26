/**
 * Cookie consent, stored per browser.
 *   "1" = all cookies (analytics and ad pixels may load)
 *   "0" = essential only (no third-party tracking)
 *   unset = not decided yet, the banner is shown
 */
export const CONSENT_KEY = "panelim:cookie-accepted";
export const CONSENT_EVENT = "panelim:cookie-change";

export type ConsentChoice = "all" | "essential";

export function readConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === "1") return "all";
    if (v === "0") return "essential";
    return null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_KEY, choice === "all" ? "1" : "0");
  } catch {
    /* storage blocked: the choice lasts for this page view only */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function subscribeConsent(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(CONSENT_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CONSENT_EVENT, cb);
  };
}
