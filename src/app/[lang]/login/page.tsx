import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthKommoClient } from "@/components/marketing/AuthKommoClient";
import { AuthShell } from "@/components/marketing/AuthShell";
import { enabledProviders } from "@/lib/auth/oauth";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/login",
    title: d.subpages.authPages.login.title,
    description: d.subpages.authPages.login.subtitle,
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const auth = d.subpages.authPages;
  const login = auth.login;
  const shell = auth.shell;

  return (
    <div className="marketing">
      <a href="#main" className="skip-link">
        {d.a11y.skipToMain}
      </a>

      <AuthShell
        copy={{
          brandName: d.brand,
          switchHref: `/${locale}/register`,
          switchLabel: login.topSwitchLabel,
          switchVariant: "filled",
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
        <Suspense>
        <AuthKommoClient
          lang={locale}
          copy={{
            title: login.title,
            emailLabel: login.emailLabel,
            emailPlaceholder: login.emailPlaceholder,
            keyLabel: login.keyLabel,
            keyPlaceholder: login.keyPlaceholder,
            showKey: login.showKey,
            hideKey: login.hideKey,
            submit: login.submit,
            submitting: login.submitting,
            passkeyLabel: login.passkeyLabel,
            googleLabel: shell.googleLabel,
            facebookLabel: shell.facebookLabel,
            oauthDenied: login.oauthDenied,
            oauthError: login.oauthError,
            oauthEmail: login.oauthEmail,
            forgotLink: login.forgotLink,
            invalidKey: login.invalidKey,
            rateLimited: login.rateLimited,
            networkError: login.networkError,
            securityNote: login.securityNote,
          }}
          contactHref={`/${locale}/contact`}
          providers={enabledProviders()}
        />
        </Suspense>
      </AuthShell>
    </div>
  );
}
