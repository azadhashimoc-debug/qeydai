import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage, infoMetadata } from "@/components/marketing/InfoPage";
import { CASE_SLUGS, isCaseSlug } from "../../dictionaries/pages";
import { locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.flatMap((lang) => CASE_SLUGS.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/cases/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isCaseSlug(slug)) notFound();
  return infoMetadata(lang, `cases/${slug}`);
}

export default async function CasePage({ params }: PageProps<"/[lang]/cases/[slug]">) {
  const { lang, slug } = await params;
  if (!isCaseSlug(slug)) notFound();
  return <InfoPage lang={lang} pageKey={`cases/${slug}`} />;
}
