export const SECTOR_SLUGS = [
  "beauty-salons",
  "clinics",
  "auto-service",
  "real-estate",
  "retail-shops",
] as const;
export type SectorSlug = (typeof SECTOR_SLUGS)[number];

const SECTOR_SLUG_SET: ReadonlySet<string> = new Set(SECTOR_SLUGS);

export function isSectorSlug(slug: string): slug is SectorSlug {
  return SECTOR_SLUG_SET.has(slug);
}

export const SECTOR_IMAGES: Record<SectorSlug, string> = {
  "beauty-salons": "p-instagram",
  "clinics": "p-booking",
  "auto-service": "p-pipeline",
  "real-estate": "p-inbox",
  "retail-shops": "p-whatsapp",
};
