"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackEvent } from "@/lib/analytics/client";
import { WEB_VITAL_METRICS, WEB_VITAL_RATINGS, type Locale, type WebVitalMetric, type WebVitalRating } from "@/lib/analytics/events";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const handleWebVitals: ReportWebVitalsCallback = (metric) => {
  if (!(WEB_VITAL_METRICS as readonly string[]).includes(metric.name)) return;
  const rating: WebVitalRating = (WEB_VITAL_RATINGS as readonly string[]).includes(metric.rating)
    ? (metric.rating as WebVitalRating)
    : "needs-improvement";
  const locale: Locale = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "az";

  trackEvent({
    event: "web_vital_measured",
    props: {
      locale,
      metric: metric.name as WebVitalMetric,
      value: metric.value,
      rating,
    },
  });
};

export function WebVitals() {
  useReportWebVitals(handleWebVitals);
  return null;
}
