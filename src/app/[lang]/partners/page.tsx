import type { Metadata } from "next";
import { InfoPage, infoMetadata } from "@/components/marketing/InfoPage";
import { locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/partners">): Promise<Metadata> {
  const { lang } = await params;
  return infoMetadata(lang, "partners");
}

export default async function PartnersPage({ params }: PageProps<"/[lang]/partners">) {
  const { lang } = await params;
  return <InfoPage lang={lang} pageKey="partners" />;
}
