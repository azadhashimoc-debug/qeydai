import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "../globals.css";
import { getDictionary, locales } from "./dictionaries";

const display = Bricolage_Grotesque({ variable: "--font-display-face", subsets: ["latin", "latin-ext"], axes: ["opsz"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin", "latin-ext"] });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: d.meta.title,
    description: d.meta.description,
    alternates: { languages: { az: "/az", en: "/en" } },
    openGraph: { title: d.meta.title, description: d.meta.description, locale: lang === "az" ? "az_AZ" : "en_US", type: "website" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <html lang={lang} className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
