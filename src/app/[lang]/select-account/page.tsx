import type { Metadata } from "next";
import { SelectAccountClient } from "@/components/marketing/SelectAccountClient";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/select-account">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const subpages = (d as { subpages?: Record<string, unknown> }).subpages ?? {};
  const sa = (subpages as Record<string, unknown>).selectAccount as
    | Record<string, string>
    | undefined;
  const title = sa?.title ?? "Choose an account";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/select-account",
    title: title.replace("{name}", locale === "az" ? "İstifadəçi" : "User"),
    description: sa?.subtitle ?? "Choose an account",
    brand: d.brand,
    robots: { index: false, follow: false },
  });
}

export default async function SelectAccountPage({ params }: PageProps<"/[lang]/select-account">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const subpages = (d as { subpages?: Record<string, unknown> }).subpages ?? {};
  const sa = ((subpages as Record<string, unknown>).selectAccount as Record<string, string>) ?? {
    title: "Choose an account",
    subtitle: "Choose an account",
    badge: "Choose an account",
    switchAccount: "Switch account",
    createAccount: "Create account",
    partnerPortal: "Partner portal",
    signOut: "Sign out",
    noWorkspaces: "No workspaces",
    createWorkspace: "Create workspace",
  };
  const shell = ((subpages as Record<string, unknown>).shell as Record<string, string>) ?? {
    closeLabel: locale === "az" ? "Ana səhifəyə qayıt" : "Return to home",
  };

  return (
    <SelectAccountClient
      lang={locale}
      skipToMain={d.a11y.skipToMain}
      title={sa.title.replace("{name}", locale === "az" ? "İstifadəçi" : "User")}
      subtitle={sa.subtitle}
      badge={sa.badge}
      closeLabel={shell.closeLabel}
      switchAccount={sa.switchAccount}
      createAccount={sa.createAccount}
      partnerPortal={sa.partnerPortal}
      signOut={sa.signOut}
      noWorkspaces={sa.noWorkspaces}
      createWorkspace={sa.createWorkspace}
      demoAccount={sa.demoAccount}
      loginAccount={sa.loginAccount}
      createAccountTitle={sa.createAccountTitle}
    />
  );
}
