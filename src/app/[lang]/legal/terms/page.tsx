import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/marketing/LegalPage";
import { locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/legal/terms">): Promise<Metadata> {
  const { lang } = await params;
  return legalMetadata("terms", lang);
}

export default async function TermsPage({ params }: PageProps<"/[lang]/legal/terms">) {
  const { lang } = await params;
  return <LegalPage kind="terms" lang={lang} />;
}
