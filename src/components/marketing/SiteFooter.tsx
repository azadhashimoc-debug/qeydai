import Link from "next/link";
import type { Locale, SubpagesDict } from "@/app/[lang]/dictionaries";
import { LogoMark } from "@/components/Logo";
import { KommoOverlays } from "./KommoOverlays";

export type SiteFooterProps = {
  lang: Locale;
  other: Locale;
  tagline: string;
  copyright: string;
  switchLabel: string;
  cols: SubpagesDict["footer"];
  routeSuffix?: string;
};

export function SiteFooter({
  lang,
  other,
  tagline,
  copyright,
  switchLabel,
  cols,
  routeSuffix = "",
}: SiteFooterProps) {
  const c = cols.cols;

  return (
    <footer className="pm-footer">
      <div className="pm-wrap">
        <div className="pm-footer-top">
          <div className="pm-footer-brand">
            <Link className="pm-brand" href={`/${lang}`}>
              <LogoMark size={28} />
              <span translate="no">
                panelim<span>.az</span>
              </span>
            </Link>
            <p>{tagline}</p>
          </div>

          <div className="pm-footer-cols">
            <div>
              <h4>{c.product.title}</h4>
              <ul>
                <li>
                  <Link href={`/${lang}/product`}>{c.product.tour}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/pipeline`}>{c.product.pipeline}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/inbox`}>{c.product.inbox}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/ai`}>{c.product.ai}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/booking`}>{c.product.booking}</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4>{c.channels.title}</h4>
              <ul>
                <li>
                  <Link href={`/${lang}/channels/whatsapp`}>{c.channels.whatsapp}</Link>
                </li>
                <li>
                  {/* Frozen Instagram and Telegram links are not rendered. */}
                </li>
                <li>
                  <Link href={`/${lang}/channels/webhook-api`}>{c.channels.api}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/tools`}>{c.channels.tools}</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4>{c.resources.title}</h4>
              <ul>
                <li>
                  <Link href={`/${lang}/pricing`}>{c.resources.pricing}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/scenarios/fitness-centers`}>{c.resources.fitness}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/industries`}>{lang === "en" ? "Industries" : "Sektorlar"}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/cases`}>{lang === "en" ? "Scenarios" : "Ssenarilər"}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/integrations`}>{lang === "en" ? "Integrations" : "İnteqrasiyalar"}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/partners`}>{lang === "en" ? "Partners" : "Tərəfdaşlar"}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/blog`}>{c.resources.blog}</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4>{c.legal.title}</h4>
              <ul>
                <li>
                  <Link href={`/${lang}/legal/terms`}>{c.legal.terms}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/legal/privacy`}>{c.legal.privacy}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/legal/data-deletion`}>
                    {lang === "en" ? "Data deletion" : "Məlumatların silinməsi"}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/login`}>{c.legal.login}</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pm-footer-bottom">
          <p>{copyright}</p>
          <Link href={`/${other}${routeSuffix}`} hrefLang={other} className="pm-footer-lang">
            {switchLabel}
          </Link>
        </div>
      </div>
      <KommoOverlays lang={lang} />
    </footer>
  );
}
