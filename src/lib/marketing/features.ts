export const FEATURE_SLUGS = ["automation", "broadcast", "copilot", "analytics", "integrations"] as const;
export type FeatureSlug = (typeof FEATURE_SLUGS)[number];

const FEATURE_SLUG_SET: ReadonlySet<string> = new Set(FEATURE_SLUGS);

export function isFeatureSlug(slug: string): slug is FeatureSlug {
  return FEATURE_SLUG_SET.has(slug);
}

/** "live" features exist in the product today; "soon" ones are in development and must be labelled as such. */
export const FEATURE_STATUS: Record<FeatureSlug, "live" | "soon"> = {
  automation: "live",
  broadcast: "soon",
  copilot: "soon",
  analytics: "live",
  integrations: "live",
};

export const FEATURE_IMAGES: Record<FeatureSlug, string> = {
  automation: "p-salesbot",
  broadcast: "p-whatsapp",
  copilot: "p-ai-copilot",
  analytics: "p-demo-stats",
  integrations: "p-tools",
};
