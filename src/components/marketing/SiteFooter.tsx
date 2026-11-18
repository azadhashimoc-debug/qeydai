import Link from "next/link";
import type { Locale, SubpagesDict } from "@/app/[lang]/dictionaries";
import { LogoMark } from "@/components/Logo";

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
              <h4>{cols.productCol.title}</h4>
              <ul>
                <li>
                  <Link href={`/${lang}/product`}>{cols.productCol.overview}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/pipeline`}>{cols.productCol.pipeline}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/inbox`}>{cols.productCol.inbox}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/ai`}>{cols.productCol.ai}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/booking`}>{cols.productCol.booking}</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4>{cols.channelsCol.title}</h4>
              <ul>
                <li>
                  <Link href={`/${lang}/channels/whatsapp`}>{cols.channelsCol.whatsapp}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/channels/instagram`}>{cols.channelsCol.instagram}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/channels/telegram`}>{cols.channelsCol.telegram}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/channels/webhook-api`}>{cols.channelsCol.webhook}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/tools`}>{cols.channelsCol.tools}</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4>{cols.resourcesCol.title}</h4>
              <ul>
                <li>
                  <Link href={`/${lang}/pricing`}>{cols.resourcesCol.pricing}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/scenarios/fitness-centers`}>{cols.resourcesCol.fitness}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/blog`}>{cols.resourcesCol.blog}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/demo`}>{cols.resourcesCol.demo}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/contact`}>{cols.resourcesCol.contact}</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4>{cols.legalCol.title}</h4>
              <ul>
                <li>
                  <Link href={`/${lang}/legal/terms`}>{cols.legalCol.terms}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/legal/privacy`}>{cols.legalCol.privacy}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/login`}>{cols.legalCol.login}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/register`}>{cols.legalCol.register}</Link>
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
    </footer>
  );
}
