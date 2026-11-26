import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthShell } from "@/components/marketing/AuthShell";
import { ResetPasswordClient } from "@/components/marketing/ResetPasswordClient";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary } from "../dictionaries";
import "../marketing.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/reset-password">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/reset-password",
    title: locale === "en" ? "Choose a new password" : "Yeni şifrə təyin et",
    description:
      locale === "en"
        ? "Set a new password for your panelim.az account."
        : "panelim.az hesabınız üçün yeni şifrə təyin edin.",
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function ResetPasswordPage({ params, searchParams }: PageProps<"/[lang]/reset-password">) {
  await connection();
  const { lang } = await params;
  const query = await searchParams;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const auth = d.subpages.authPages;
  const shell = auth.shell;
  const token = typeof query.token === "string" ? query.token.trim() : "";

  return (
    <div className="marketing">
      <a href="#main" className="skip-link">
        {d.a11y.skipToMain}
      </a>
      <AuthShell
        copy={{
          brandName: d.brand,
          switchHref: `/${locale}/login`,
          switchLabel: auth.register.topSwitchLabel,
          switchVariant: "outline",
          homeHref: `/${locale}`,
          closeLabel: shell.closeLabel,
          speechText: shell.speechText,
          chatLabel: shell.chatLabel,
          chatHref: `/${locale}/contact`,
          bannerText: shell.bannerText,
          bannerHref: `/${locale}/pricing`,
          dismissLabel: shell.dismissLabel,
          magnifierAlt: shell.magnifierAlt,
          heartAlt: shell.heartAlt,
        }}
      >
        <ResetPasswordClient
          lang={locale}
          token={token}
          loginHref={`/${locale}/login`}
          forgotHref={`/${locale}/forgot-password`}
        />
      </AuthShell>
    </div>
  );
}
