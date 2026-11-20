import type { Locale } from "./dictionaries";

// The error boundary is a client component and cannot await getDictionary(), so its few strings live here.
// Kept tiny on purpose: importing a full dictionary JSON would ship every page string to the browser.
export const errorCopy = {
  az: {
    label: "Xəta",
    title: "Səhifə yüklənmədi",
    body: "Müvəqqəti nasazlıq baş verdi. Yenidən yoxlayın və ya ana səhifəyə qayıdın.",
    retry: "Yenidən yoxla",
    reset: "Səhifəni yenilə",
    home: "Ana səhifə",
  },
  en: {
    label: "Error",
    title: "This page did not load",
    body: "Something went wrong for a moment. Try again or go back to the home page.",
    retry: "Try again",
    reset: "Refresh page",
    home: "Home page",
  },
} satisfies Record<Locale, Record<string, string>>;

export function errorCopyFor(lang: unknown) {
  return lang === "en" ? errorCopy.en : errorCopy.az;
}
