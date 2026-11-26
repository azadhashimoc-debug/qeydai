import type { Metadata } from "next";
import { InfoPage, infoMetadata } from "@/components/marketing/InfoPage";
import { locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/channels/whatsapp-broadcast">): Promise<Metadata> {
  const { lang } = await params;
  return infoMetadata(lang, "channels/whatsapp-broadcast");
}

export default async function WhatsAppBroadcastPage({
  params,
}: PageProps<"/[lang]/channels/whatsapp-broadcast">) {
  const { lang } = await params;
  return <InfoPage lang={lang} pageKey="channels/whatsapp-broadcast" />;
}
