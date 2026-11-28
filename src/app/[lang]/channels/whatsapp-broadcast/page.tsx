import { redirect } from "next/navigation";
import { locales } from "../../dictionaries";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function WhatsAppBroadcastPage({ params }: PageProps<"/[lang]/channels/whatsapp-broadcast">) {
  const { lang } = await params;
  redirect(`/${lang}/channels`);
}
