import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PanelShell } from "@/components/panel/PanelShell";
import type { PanelLocale } from "@/components/panel/types";
import { getDictionary } from "../dictionaries";
import "./panel.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/panel">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return {
    title: `${d.brand} — ${d.panel.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function PanelPage({ params }: PageProps<"/[lang]/panel">) {
  await connection();
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale: PanelLocale = lang === "en" ? "en" : "az";

  return (
    <Suspense
      fallback={
        <div className="crm-screen flex min-h-screen items-center justify-center px-4">
          <div className="panel-register px-6 py-5 text-center" role="status" aria-live="polite">
            <p className="text-sm font-semibold text-muted">{d.panel.loading}</p>
          </div>
        </div>
      }
    >
      <PanelShell
        lang={locale}
        brand={d.brand}
        d={d.panel}
        skipToMain={d.a11y.skipToMain}
      />
    </Suspense>
  );
}
