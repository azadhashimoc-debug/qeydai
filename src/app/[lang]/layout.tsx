import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { getDictionary, locales } from "./dictionaries";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return {
    title: d.meta.title,
    description: d.meta.description,
    alternates: { languages: { az: "/az", en: "/en" } },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <html lang={lang} className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
