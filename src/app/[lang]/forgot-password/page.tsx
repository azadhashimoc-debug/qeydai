import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthShell } from "@/components/marketing/AuthShell";
import { ForgotPasswordClient } from "@/components/marketing/ForgotPasswordClient";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary } from "../dictionaries";
import "../marketing.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/forgot-password">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/forgot-password",
    title: locale === "en" ? "Reset password" : "Şifrəni sıfırla",
    description:
      locale === "en"
        ? "Request a password reset link for your panelim.az account."
        : "panelim.az hesabınız üçün şifrə sıfırlama linki tələb edin.",
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function ForgotPasswordPage({ params }: PageProps<"/[lang]/forgot-password">) {
  await connection();
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const auth = d.subpages.authPages;
  const shell = auth.shell;

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
        <ForgotPasswordClient
          lang={locale}
          loginHref={`/${locale}/login`}
          contactHref={`/${locale}/contact`}
        />
      </AuthShell>
    </div>
  );
}
