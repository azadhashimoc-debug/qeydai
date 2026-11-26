import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthShell } from "@/components/marketing/AuthShell";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary } from "../dictionaries";
import "../marketing.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/link-account">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/link-account",
    title: locale === "en" ? "Link your account" : "Hesabı əlaqələndirin",
    description: locale === "en" ? "Confirm your password to link sign-in." : "Girişi əlaqələndirmək üçün şifrənizi təsdiqləyin.",
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function LinkAccountPage({ params, searchParams }: PageProps<"/[lang]/link-account">) {
  await connection();
  const { lang } = await params;
  const query = await searchParams;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const auth = d.subpages.authPages;
  const shell = auth.shell;
  const isEn = locale === "en";
  const token = typeof query.t === "string" ? query.t : "";
  const error = typeof query.error === "string" ? query.error : "";

  const t = isEn
    ? {
        title: "Confirm your password",
        body: "An account with this email already exists and uses a password. Enter its password once to link Google or Facebook sign-in to it.",
        label: "Password",
        submit: "Link and sign in",
        invalid: "The password is incorrect.",
        limited: "Too many attempts. Try again later.",
        expired: "This link has expired. Start again from the login page.",
        back: "Back to sign in",
      }
    : {
        title: "Şifrənizi təsdiqləyin",
        body: "Bu e-poçt ilə şifrəli hesab artıq var. Google və ya Facebook girişini bu hesaba bağlamaq üçün şifrəni bir dəfə daxil edin.",
        label: "Şifrə",
        submit: "Bağla və daxil ol",
        invalid: "Şifrə yanlışdır.",
        limited: "Çox cəhd edildi. Bir az sonra yenidən cəhd edin.",
        expired: "Bu keçid müddəti bitib. Giriş səhifəsindən yenidən başlayın.",
        back: "Girişə qayıt",
      };

  const message = !token ? t.expired
    : error === "limited" ? t.limited
    : error ? t.invalid
    : "";

  return (
    <div className="marketing">
      <a href="#main" className="skip-link">{d.a11y.skipToMain}</a>
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
        <div className="pm-auth-form">
          <h1 className="pm-auth-title">{t.title}</h1>
          <p>{t.body}</p>
          {token ? (
            <form method="post" action="/api/panel/oauth/link">
              <input type="hidden" name="t" value={token} />
              <div className="pm-auth-field">
                <label htmlFor="link-password" className="pm-sr-only">{t.label}</label>
                <input
                  id="link-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                  className="pm-auth-input"
                  placeholder={t.label}
                />
              </div>
              <button type="submit" className="pm-auth-submit-pill">{t.submit}</button>
            </form>
          ) : null}
          {message ? <p role="alert" className="pm-auth-status is-error">{message}</p> : null}
          <p><a href={`/${locale}/login`}>{t.back}</a></p>
        </div>
      </AuthShell>
    </div>
  );
}
