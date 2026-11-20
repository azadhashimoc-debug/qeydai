import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { LogoMark } from "@/components/Logo";
import { buttonClass } from "@/components/ui/button";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "404 — panelim.az",
  description: "Səhifə tapılmadı / Page not found.",
};

export default function GlobalNotFound() {
  return (
    <html lang="az" className={`${body.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col justify-between bg-bg text-ink antialiased">
        <header className="border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
            <Link href="/az" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
              <LogoMark />
              <span translate="no">panelim.az</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-2xl flex-col items-start px-5 py-20">
          <p className="rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand tabular-nums">404</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">Səhifə tapılmadı</h1>
          <p className="mt-3 max-w-[44ch] text-muted">
            Axtardığınız ünvan mövcud deyil. Ana səhifəyə qayıdın və ya dili seçin.
          </p>
          <p lang="en" className="mt-1 max-w-[44ch] text-sm text-muted">
            The page you requested could not be found. Choose a language below.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/az" hrefLang="az" className={buttonClass()}>
              Azərbaycan dili (/az)
            </Link>
            <Link href="/en" hrefLang="en" lang="en" className={buttonClass({ variant: "secondary" })}>
              English (/en)
            </Link>
          </div>
        </main>

        <footer className="border-t border-line py-6">
          <div className="mx-auto max-w-6xl px-5 text-sm text-muted">
            <span translate="no">panelim.az</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
