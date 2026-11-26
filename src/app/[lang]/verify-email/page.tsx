import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthShell } from "@/components/marketing/AuthShell";
import { VerifyEmailClient } from "@/components/marketing/VerifyEmailClient";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary } from "../dictionaries";
import "../marketing.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/verify-email">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/verify-email",
    title: locale === "en" ? "Verify email" : "E-poçt təsdiqi",
    description:
      locale === "en"
        ? "Confirm your email address to activate your panelim.az workspace."
        : "panelim.az iş sahənizi aktivləşdirmək üçün e-poçt ünvanınızı təsdiqləyin.",
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function VerifyEmailPage({ params, searchParams }: PageProps<"/[lang]/verify-email">) {
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
        <VerifyEmailClient
          lang={locale}
          token={token}
          panelHref={`/${locale}/panel`}
          loginHref={`/${locale}/login`}
        />
      </AuthShell>
    </div>
  );
}
