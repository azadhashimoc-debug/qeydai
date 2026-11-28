export const CHANNEL_SLUGS: readonly ("whatsapp" | "instagram" | "telegram" | "webhook-api")[] = ["whatsapp", "webhook-api"];
export type ChannelSlug = (typeof CHANNEL_SLUGS)[number];

export const BLOG_SLUGS = [
  "whatsapp-automation",
  "instagram-dm-sales",
  "appointment-crm",
  "ai-reply-workflows",
  "telegram-lead-capture",
] as const;
export type BlogSlug = (typeof BLOG_SLUGS)[number];

const CHANNEL_SLUG_SET: ReadonlySet<string> = new Set(CHANNEL_SLUGS);
const BLOG_SLUG_SET: ReadonlySet<string> = new Set(BLOG_SLUGS);

export function isChannelSlug(slug: string): slug is ChannelSlug {
  return CHANNEL_SLUG_SET.has(slug);
}

export function isBlogSlug(slug: string): slug is BlogSlug {
  return BLOG_SLUG_SET.has(slug);
}
