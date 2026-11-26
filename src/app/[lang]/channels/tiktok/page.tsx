import type { Metadata } from "next";
import { InfoPage, infoMetadata } from "@/components/marketing/InfoPage";
import { locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/channels/tiktok">): Promise<Metadata> {
  const { lang } = await params;
  return infoMetadata(lang, "channels/tiktok");
}

export default async function TikTokPage({ params }: PageProps<"/[lang]/channels/tiktok">) {
  const { lang } = await params;
  return <InfoPage lang={lang} pageKey="channels/tiktok" />;
}
