import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/marketing/LegalPage";
import { locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/legal/data-deletion">): Promise<Metadata> {
  const { lang } = await params;
  return legalMetadata("data-deletion", lang);
}

export default async function DataDeletionPage({ params }: PageProps<"/[lang]/legal/data-deletion">) {
  const { lang } = await params;
  return <LegalPage kind="data-deletion" lang={lang} />;
}
