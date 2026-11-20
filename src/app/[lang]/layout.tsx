import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { WebVitals } from "@/components/WebVitals";
import "../globals.css";
import { getDictionary, locales } from "./dictionaries";

const body = Inter({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9FF" },
    { media: "(prefers-color-scheme: dark)", color: "#090624" },
  ],
};

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
    alternates: {
      canonical: `/${lang}`,
      languages: { az: "/az", en: "/en", "x-default": "/az" },
    },
    openGraph: {
      title: d.meta.title,
      description: d.meta.description,
      url: `/${lang}`,
      siteName: d.brand,
      locale: lang === "az" ? "az_AZ" : "en_US",
      type: "website",
      images: [{ url: "/images/w-lobby.webp", width: 1200, height: 630, alt: d.alts.lobby }],
    },
    twitter: {
      card: "summary_large_image",
      title: d.meta.title,
      description: d.meta.description,
      images: ["/images/w-lobby.webp"],
    },
    icons: {
      icon: [{ url: "/icon.svg", sizes: "any" }],
      apple: [{ url: "/icon.svg" }],
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <html lang={lang} className={`${body.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased">
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
