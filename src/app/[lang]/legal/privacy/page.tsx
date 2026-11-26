import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/marketing/LegalPage";
import { locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/legal/privacy">): Promise<Metadata> {
  const { lang } = await params;
  return legalMetadata("privacy", lang);
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/legal/privacy">) {
  const { lang } = await params;
  return <LegalPage kind="privacy" lang={lang} />;
}
