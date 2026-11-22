import type { Metadata } from "next";
import { AuthKommoRegisterClient } from "@/components/marketing/AuthKommoRegisterClient";
import { AuthShell } from "@/components/marketing/AuthShell";
import { AuthEmailLink } from "@/components/marketing/AuthEmailLink";
import { emailConfigured } from "@/lib/auth/email";
import { enabledProviders } from "@/lib/auth/oauth";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/register">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/register",
    title: d.subpages.authPages.register.title,
    description: d.subpages.authPages.register.subtitle,
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function RegisterPage({ params }: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const auth = d.subpages.authPages;
  const emailLinkEnabled = emailConfigured();
  const reg = auth.register;
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
          switchLabel: reg.topSwitchLabel,
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
        <AuthKommoRegisterClient
          locale={locale}
          copy={{
            title: reg.title,
            subtitle: reg.subtitle,
            emailLabel: auth.login.emailLabel,
            emailPlaceholder: auth.login.emailPlaceholder,
            name: reg.form.nameLabel,
            namePlaceholder: reg.form.namePlaceholder,
            phone: reg.form.phoneLabel,
            phonePlaceholder: reg.form.phonePlaceholder,
            submit: reg.form.submit,
            sending: reg.form.submitting,
            nameRequired: reg.form.nameRequired,
            privacy: reg.form.privacyNote,
            okText: reg.form.successTitle,
            errText: reg.form.successBody,
            rateLimitedText: reg.form.rateLimited,
            googleLabel: shell.googleLabel,
            facebookLabel: shell.facebookLabel,
            termsPrefix: reg.termsPrefix,
            termsLinkText: reg.termsLinkText,
            termsAnd: reg.termsAnd,
            privacyLinkText: reg.privacyLinkText,
            hasAccount: reg.hasAccount,
            loginLink: reg.loginLink,
          }}
          loginHref={`/${locale}/login`}
          termsHref={`/${locale}/legal/terms`}
          privacyHref={`/${locale}/legal/privacy`}
          providers={enabledProviders()}
          extra={emailLinkEnabled ? (
            <AuthEmailLink
              lang={locale}
              copy={{
                emailLabel: auth.login.emailLabel,
                emailPlaceholder: auth.login.emailPlaceholder,
                hint: auth.emailLink.hint,
                submit: auth.emailLink.submit,
                sending: auth.emailLink.sending,
                sent: auth.emailLink.sent,
                invalid: auth.emailLink.invalid,
                rateLimited: auth.emailLink.rateLimited,
                error: auth.emailLink.error,
              }}
            />
          ) : undefined}
        />
      </AuthShell>
    </div>
  );
}
