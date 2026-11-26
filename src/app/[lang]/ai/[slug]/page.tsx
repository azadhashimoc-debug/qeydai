import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage, infoMetadata } from "@/components/marketing/InfoPage";
import { AI_SLUGS, isAiSlug } from "../../dictionaries/pages";
import { locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.flatMap((lang) => AI_SLUGS.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/ai/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isAiSlug(slug)) notFound();
  return infoMetadata(lang, `ai/${slug}`);
}

export default async function AiSubPage({ params }: PageProps<"/[lang]/ai/[slug]">) {
  const { lang, slug } = await params;
  if (!isAiSlug(slug)) notFound();
  return <InfoPage lang={lang} pageKey={`ai/${slug}`} />;
}
