import Link from "next/link";
import type { Dictionary, Locale, SubpagesDict } from "@/app/[lang]/dictionaries";
import { LogoMark } from "@/components/Logo";
import {
  HeaderMobileMenu,
  type HeaderDropdownGroup,
  NavDropdown,
} from "./SiteHeaderInteractive";

export type SiteHeaderProps = {
  lang: Locale;
  brand: string;
  a11y: Pick<Dictionary["a11y"], "mainNav">;
  nav: Dictionary["landing"]["nav"];
  subNav: SubpagesDict["navGroups"];
  mode?: "landing" | "subpage";
  routeSuffix?: string;
};

export function SiteHeader({
  lang,
  brand,
  a11y,
  nav,
  subNav,
  mode = "subpage",
  routeSuffix = "",
}: SiteHeaderProps) {
  const other: Locale = lang === "en" ? "az" : "en";
  const switchHref = mode === "landing" ? `/${other}` : `/${other}${routeSuffix}`;
  const demoHref = `/${lang}/demo`;
  const demoLabel = mode === "landing" ? subNav.actions.demo : nav.demo;
  const switchLabel = other === "en" ? "English" : "Azərbaycan dili";

  const productItems = [
    ...(mode === "landing"
      ? [
          { href: "#how", title: nav.product },
          { href: "#features", title: nav.features },
          { href: "#ai", title: nav.ai },
        ]
      : []),
    { href: `/${lang}/product`, title: subNav.product.tourTitle, desc: subNav.product.tourDesc },
    { href: `/${lang}/pipeline`, title: subNav.product.pipelineTitle, desc: subNav.product.pipelineDesc },
    { href: `/${lang}/inbox`, title: subNav.product.inboxTitle, desc: subNav.product.inboxDesc },
    { href: `/${lang}/ai`, title: subNav.product.aiTitle, desc: subNav.product.aiDesc },
    { href: `/${lang}/booking`, title: subNav.product.bookingTitle, desc: subNav.product.bookingDesc },
    { href: `/${lang}/features/automation`, title: subNav.product.automationTitle, desc: subNav.product.automationDesc },
    { href: `/${lang}/features/broadcast`, title: subNav.product.broadcastTitle, desc: subNav.product.broadcastDesc },
    { href: `/${lang}/features/copilot`, title: subNav.product.copilotTitle, desc: subNav.product.copilotDesc },
    { href: `/${lang}/features/analytics`, title: subNav.product.analyticsTitle, desc: subNav.product.analyticsDesc },
    { href: `/${lang}/features/integrations`, title: subNav.product.integrationsTitle, desc: subNav.product.integrationsDesc },
  ];

  const channelsItems = [
    { href: `/${lang}/channels`, title: subNav.channels.hubTitle, desc: subNav.channels.hubDesc },
    { href: `/${lang}/channels/whatsapp`, title: subNav.channels.whatsappTitle, desc: subNav.channels.whatsappDesc },
    { href: `/${lang}/channels/instagram`, title: subNav.channels.instagramTitle, desc: subNav.channels.instagramDesc },
    { href: `/${lang}/channels/telegram`, title: subNav.channels.telegramTitle, desc: subNav.channels.telegramDesc },
    { href: `/${lang}/channels/webhook-api`, title: subNav.channels.apiTitle, desc: subNav.channels.apiDesc },
    { href: `/${lang}/tools`, title: subNav.channels.toolsTitle, desc: subNav.channels.toolsDesc },
  ];

  const resourcesItems = [
    { href: `/${lang}/pricing`, title: subNav.resources.pricingTitle, desc: subNav.resources.pricingDesc },
    { href: `/${lang}/scenarios/fitness-centers`, title: subNav.resources.fitnessTitle, desc: subNav.resources.fitnessDesc },
    { href: `/${lang}/blog`, title: subNav.resources.blogTitle, desc: subNav.resources.blogDesc },
  ];

  const groups: HeaderDropdownGroup[] = [
    { id: "product", label: subNav.product.label, items: productItems },
    { id: "channels", label: subNav.channels.label, items: channelsItems },
    { id: "resources", label: subNav.resources.label, items: resourcesItems },
  ];

  const directLinks =
    mode === "landing"
      ? [
          { href: `/${lang}/pricing`, label: nav.pricing },
          { href: "#faq", label: nav.faq },
        ]
      : [{ href: `/${lang}/pricing`, label: subNav.resources.pricingTitle }];

  return (
    <header className={mode === "landing" ? "pm-header pm-header--landing" : "pm-header"}>
      <nav className="pm-wrap pm-nav" aria-label={a11y.mainNav}>
        <Link className="pm-brand" href={`/${lang}`} aria-label={brand}>
          <LogoMark size={30} />
          <span translate="no">
            panelim<span>.az</span>
          </span>
        </Link>

        <div className="pm-nav-links">
          <NavDropdown group={groups[0]} lang={lang} />
          <NavDropdown group={groups[1]} lang={lang} />
          {directLinks.map((link) => (
            <Link key={link.href} href={link.href} className="pm-nav-direct">
              {link.label}
            </Link>
          ))}
          <NavDropdown group={groups[2]} lang={lang} />
        </div>

        <div className="pm-nav-right">
          <Link
            href={switchHref}
            hrefLang={other}
            data-track-lang={other}
            className={mode === "landing" ? "pm-nav-language" : "pm-lang-pill"}
            aria-label={mode === "landing" ? switchLabel : undefined}
            title={mode === "landing" ? switchLabel : undefined}
          >
            {mode === "landing" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" />
                <ellipse cx="12" cy="12" rx="4" ry="9.5" />
                <path d="M3.5 8.5h17M3.5 15.5h17" />
              </svg>
            ) : other.toUpperCase()}
          </Link>

          {mode === "landing" && <span className="pm-nav-language-divider" aria-hidden="true" />}

          <div className="pm-nav-actions">
            <Link
              href={demoHref}
              data-track-cta="header"
              className={mode === "landing" ? "pm-nav-demo" : "pm-nav-globe"}
            >
              {mode === "subpage" && <span className="pm-nav-globe-icon" aria-hidden="true">🌐</span>}
              {demoLabel}
            </Link>
            {mode === "subpage" && <span className="pm-nav-separator" aria-hidden="true">|</span>}
            <Link className="pm-nav-signin" href={`/${lang}/login`}>
              {subNav.actions.login}
            </Link>
            <Link className="pm-nav-create" href={`/${lang}/register`}>
              {subNav.actions.register}
            </Link>
          </div>

          <HeaderMobileMenu
            groups={groups}
            directLinks={directLinks}
            loginLabel={subNav.actions.login}
            loginHref={`/${lang}/login`}
            registerLabel={subNav.actions.register}
            registerHref={`/${lang}/register`}
            demoLabel={demoLabel}
            demoHref={demoHref}
            menuOpenLabel={nav.menuOpen}
            menuCloseLabel={nav.menuClose}
          />
        </div>
      </nav>
    </header>
  );
}
