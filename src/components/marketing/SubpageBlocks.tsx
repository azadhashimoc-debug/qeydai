import Link from "next/link";
import type { ReactNode } from "react";
import { Photo } from "@/components/Photo";

export type SubpageHeroProps = {
  badge: string;
  title: string;
  subtitle: string;
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  image: string;
  imageAlt: string;
  badgeVariant?: "default" | "mint" | "amber";
};

export function SubpageHero({
  badge,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  image,
  imageAlt,
  badgeVariant = "default",
}: SubpageHeroProps) {
  const badgeClass =
    badgeVariant === "mint"
      ? "pm-subhero-badge is-mint"
      : badgeVariant === "amber"
        ? "pm-subhero-badge is-amber"
        : "pm-subhero-badge";

  return (
    <section className="pm-subhero">
      <div className="pm-wrap pm-subhero-grid">
        <div className="pm-subhero-copy">
          <span className={badgeClass}>{badge}</span>
          <h1>{title}</h1>
          <p className="pm-subhero-sub">{subtitle}</p>
          {(primaryCta || secondaryCta) && (
            <div className="pm-hero-actions">
              {primaryCta && (
                <Link href={primaryCta.href} className="pm-btn pm-btn-primary">
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link href={secondaryCta.href} className="pm-btn pm-btn-outline">
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="pm-subhero-media">
          <div className="pm-subhero-frame">
            <Photo
              name={image}
              alt={imageAlt}
              priority
              sizes="(max-width: 900px) 100vw, 520px"
              className="pm-subhero-img"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export type FeatureAlternatingRow = {
  tag?: string;
  title: string;
  body: string;
  bullets?: string[];
  cta?: { href: string; label: string };
  image: string;
  imageAlt: string;
  tone?: "lavender" | "mint" | "sky" | "plum";
};

export function FeatureAlternating({
  heading,
  subheading,
  rows,
}: {
  heading?: string;
  subheading?: string;
  rows: FeatureAlternatingRow[];
}) {
  const toneClass = (tone?: FeatureAlternatingRow["tone"]) => {
    if (tone === "mint") return "pm-vis-mint";
    if (tone === "sky") return "pm-vis-sky";
    if (tone === "plum") return "pm-vis-plum";
    return "pm-vis-lavender";
  };

  return (
    <section className="pm-section pm-bento">
      <div className="pm-wrap">
        {(heading || subheading) && (
          <div className="pm-section-head">
            {heading && <h2>{heading}</h2>}
            {subheading && <p>{subheading}</p>}
          </div>
        )}

        <div className="pm-bento-rows">
          {rows.map((row, idx) => (
            <article
              key={row.title}
              className={idx % 2 === 1 ? "pm-bento-row is-reversed" : "pm-bento-row"}
            >
              <div className="pm-bento-copy">
                {row.tag && <span className="pm-tag">{row.tag}</span>}
                <h3>{row.title}</h3>
                <p>{row.body}</p>
                {row.bullets && row.bullets.length > 0 && (
                  <ul className="pm-check-list">
                    {row.bullets.map((bullet) => (
                      <li key={bullet}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                          <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {row.cta && (
                  <Link href={row.cta.href} className="pm-link-arrow">
                    {row.cta.label}
                  </Link>
                )}
              </div>

              <div className={`pm-bento-visual ${toneClass(row.tone)}`}>
                <div className="pm-visual-photo pm-sub-photo-wrap">
                  <Photo
                    name={row.image}
                    alt={row.imageAlt}
                    sizes="(max-width: 900px) 100vw, 520px"
                    className="pm-sub-photo-box"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export type FeatureGridItem = {
  title: string;
  desc: string;
  href?: string;
  ctaLabel?: string;
  tone?: "mint" | "lavender" | "sky" | "amber" | "white";
  icon?: ReactNode;
};

export function FeatureGrid({
  heading,
  subheading,
  items,
  columns = 2,
}: {
  heading?: string;
  subheading?: string;
  items: FeatureGridItem[];
  columns?: 2 | 3 | 4;
}) {
  const toneClass = (tone?: FeatureGridItem["tone"]) => {
    if (tone === "mint") return "pm-pastel-mint";
    if (tone === "lavender") return "pm-pastel-lavender";
    if (tone === "sky") return "pm-pastel-sky";
    if (tone === "amber") return "pm-pastel-amber";
    return "pm-pastel-white";
  };

  return (
    <section className="pm-section pm-subgrid-section">
      <div className="pm-wrap">
        {(heading || subheading) && (
          <div className="pm-section-head">
            {heading && <h2>{heading}</h2>}
            {subheading && <p>{subheading}</p>}
          </div>
        )}

        <div className={`pm-feature-grid pm-cols-${columns}`}>
          {items.map((item) => (
            <article key={item.title} className={`pm-feature-card ${toneClass(item.tone)}`}>
              {item.icon && <div className="pm-feature-icon">{item.icon}</div>}
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              {item.href && item.ctaLabel && (
                <Link href={item.href} className="pm-link-arrow">
                  {item.ctaLabel}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function KommoPromoBand({
  title,
  ctaHref,
  ctaLabel,
  tone = "lavender",
}: {
  title: string;
  ctaHref: string;
  ctaLabel: string;
  tone?: "lavender" | "amber" | "mint" | "sky";
}) {
  return (
    <section className={`pm-promo-band is-${tone}`}>
      <div className="pm-wrap pm-promo-inner">
        <h2>{title}</h2>
        <Link href={ctaHref} className="pm-promo-pill">
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}

export function BottomCtaBand({
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <section className="pm-cta-band pm-sub-cta-band">
      <div className="pm-cta-glow" aria-hidden="true" />
      <div className="pm-wrap pm-sub-cta-inner">
        <div className="pm-cta-copy">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="pm-hero-actions">
          <Link href={primaryHref} className="pm-btn pm-btn-mint">
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className="pm-btn pm-btn-light-outline">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
