import type { Metadata } from "next";
import { InfoPage, infoMetadata } from "@/components/marketing/InfoPage";
import { locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/integrations">): Promise<Metadata> {
  const { lang } = await params;
  return infoMetadata(lang, "integrations");
}

export default async function IntegrationsPage({ params }: PageProps<"/[lang]/integrations">) {
  const { lang } = await params;
  return <InfoPage lang={lang} pageKey="integrations" />;
}
