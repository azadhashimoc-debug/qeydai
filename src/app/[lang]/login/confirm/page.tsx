import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthEmailConfirm } from "@/components/marketing/AuthEmailConfirm";
import { AuthShell } from "@/components/marketing/AuthShell";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/login/confirm">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/login/confirm",
    title: d.subpages.authPages.emailLink.confirmTitle,
    description: d.subpages.authPages.emailLink.confirmBody,
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function EmailConfirmPage({ params }: PageProps<"/[lang]/login/confirm">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const auth = d.subpages.authPages;
  const shell = auth.shell;
  const mail = auth.emailLink;

  return (
    <div className="marketing">
      <a href="#main" className="skip-link">
        {d.a11y.skipToMain}
      </a>
      <AuthShell
        copy={{
          brandName: d.brand,
          switchHref: `/${locale}/register`,
          switchLabel: auth.login.topSwitchLabel,
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
          <AuthEmailConfirm
            lang={locale}
            copy={{
              title: mail.confirmTitle,
              body: mail.confirmBody,
              button: mail.confirmButton,
              confirming: mail.confirming,
              failed: mail.confirmFailed,
              back: mail.confirmBack,
            }}
          />
        </Suspense>
      </AuthShell>
    </div>
  );
}
