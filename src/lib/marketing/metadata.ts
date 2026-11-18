import type { Metadata } from "next";
import type { Locale } from "@/app/[lang]/dictionaries";

export function buildSubpageMetadata({
  lang,
  routeSuffix,
  title,
  description,
  brand,
  image = "/images/w-lobby.webp",
  robots,
}: {
  lang: Locale;
  routeSuffix: string;
  title: string;
  description: string;
  brand: string;
  image?: string;
  robots?: Metadata["robots"];
}): Metadata {
  const fullTitle = `${title} | ${brand}`;
  return {
    title: fullTitle,
    description,
    ...(robots ? { robots } : {}),
    alternates: {
      canonical: `/${lang}${routeSuffix}`,
      languages: {
        az: `/az${routeSuffix}`,
        en: `/en${routeSuffix}`,
        "x-default": `/az${routeSuffix}`,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: `/${lang}${routeSuffix}`,
      siteName: brand,
      locale: lang === "az" ? "az_AZ" : "en_US",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}
