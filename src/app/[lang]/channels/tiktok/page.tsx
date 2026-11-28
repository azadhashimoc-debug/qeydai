import { redirect } from "next/navigation";
import { locales } from "../../dictionaries";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function TikTokPage({ params }: PageProps<"/[lang]/channels/tiktok">) {
  const { lang } = await params;
  redirect(`/${lang}/channels`);
}
