import Image from "next/image";
import Link from "next/link";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import {
  InstagramIcon,
  SectorGlyph,
  TelegramIcon,
  WhatsAppIcon,
} from "@/components/ChannelIcons";
import {
  AiSpotlight,
  PricingShowcase,
} from "@/components/LandingInteractive";
import { MarketingSlider } from "@/components/marketing/MarketingSlider";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Photo } from "@/components/Photo";
import { ProductPreview } from "@/components/ProductPreview";
import { getSiteUrl } from "@/lib/http/site-url";
import { getDictionary } from "./dictionaries";
import { LeadForm } from "./LeadForm";
import "./marketing.css";

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const l = dictionary.landing;

  const siteUrl = getSiteUrl();
  const faqEntries = Object.entries(dictionary.faq.items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: dictionary.brand,
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
      },
      {
        "@type": "SoftwareApplication",
        name: dictionary.brand,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: dictionary.meta.description,
        url: siteUrl,
        inLanguage: locale === "en" ? "en" : "az",
        offers: [
          {
            "@type": "Offer",
            name: dictionary.landing.pricing.plans.starter.name,
            priceCurrency: "AZN",
            price: "49",
            priceSpecification: { "@type": "UnitPriceSpecification", price: "49", priceCurrency: "AZN", unitText: "MONTH" },
            url: `${siteUrl}/${locale}/pricing`,
          },
          {
            "@type": "Offer",
            name: dictionary.landing.pricing.plans.growth.name,
            priceCurrency: "AZN",
            price: "89",
            priceSpecification: { "@type": "UnitPriceSpecification", price: "89", priceCurrency: "AZN", unitText: "MONTH" },
            url: `${siteUrl}/${locale}/pricing`,
          },
          {
            "@type": "Offer",
            name: dictionary.landing.pricing.plans.pro.name,
            priceCurrency: "AZN",
            price: "149",
            priceSpecification: { "@type": "UnitPriceSpecification", price: "149", priceCurrency: "AZN", unitText: "MONTH" },
            url: `${siteUrl}/${locale}/pricing`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqEntries.map(([, item]) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  const sliderLabels = {
    prev: dictionary.a11y.sliderPrev,
    next: dictionary.a11y.sliderNext,
    bullet: dictionary.a11y.sliderBullet,
  };

  const sectorItems = [
    l.logos.items.one,
    l.logos.items.two,
    l.logos.items.three,
    l.logos.items.four,
    l.logos.items.five,
    l.logos.items.six,
  ];

  const aiItems = [
    l.ai.items.one,
    l.ai.items.two,
    l.ai.items.three,
    l.ai.items.four,
  ];

  const outcomeCards = [
    { ...l.outcomes.cards.one, photo: "p-inbox", alt: dictionary.alts.two },
    { ...l.outcomes.cards.two, photo: "p-demo-stats", alt: dictionary.alts.director },
    { ...l.outcomes.cards.three, photo: "p-product-tour", alt: dictionary.alts.three },
  ];

  const pricingPlans = [
    {
      key: "starter",
      name: l.pricing.plans.starter.name,
      desc: l.pricing.plans.starter.desc,
      prices: l.pricing.plans.starter.prices,
      limits: [
        l.pricing.plans.starter.limits.one,
        l.pricing.plans.starter.limits.two,
        l.pricing.plans.starter.limits.three,
      ] as [string, string, string],
      cta: l.pricing.plans.starter.cta,
    },
    {
      key: "growth",
      name: l.pricing.plans.growth.name,
      desc: l.pricing.plans.growth.desc,
      prices: l.pricing.plans.growth.prices,
      limits: [
        l.pricing.plans.growth.limits.one,
        l.pricing.plans.growth.limits.two,
        l.pricing.plans.growth.limits.three,
      ] as [string, string, string],
      cta: l.pricing.plans.growth.cta,
      popular: true,
    },
    {
      key: "pro",
      name: l.pricing.plans.pro.name,
      desc: l.pricing.plans.pro.desc,
      prices: l.pricing.plans.pro.prices,
      limits: [
        l.pricing.plans.pro.limits.one,
        l.pricing.plans.pro.limits.two,
        l.pricing.plans.pro.limits.three,
      ] as [string, string, string],
      cta: l.pricing.plans.pro.cta,
    },
    {
      key: "enterprise",
      name: l.pricing.plans.enterprise.name,
      desc: l.pricing.plans.enterprise.desc,
      staticPrice: l.pricing.plans.enterprise.price,
      limits: [
        l.pricing.plans.enterprise.limits.one,
        l.pricing.plans.enterprise.limits.two,
        l.pricing.plans.enterprise.limits.three,
      ] as [string, string, string],
      cta: l.pricing.plans.enterprise.cta,
    },
  ];

  return (
    <div className="marketing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a href="#main" className="skip-link">
        {dictionary.a11y.skipToMain}
      </a>

      <SiteHeader
        lang={locale}
        brand={dictionary.brand}
        a11y={dictionary.a11y}
        nav={l.nav}
        subNav={dictionary.subpages.navGroups}
        mode="landing"
      />

      <main id="main" tabIndex={-1}>
        <section className="pm-hero">
          <div className="pm-hero-float is-left" aria-hidden="true">
            <Image
              src="/images/auth-mascot-magnifier.webp"
              alt=""
              width={150}
              height={135}
              priority
            />
          </div>
          <div className="pm-hero-float is-right" aria-hidden="true">
            <Image
              src="/images/auth-mascot-heart.webp"
              alt=""
              width={160}
              height={148}
              priority
            />
          </div>
          <div className="pm-wrap pm-hero-inner">
            <div className="pm-hero-copy">
              <ul className="pm-channels" aria-label={l.hero.trustNote}>
                <li>
                  <WhatsAppIcon size={36} />
                  <span className="sr-only">{l.hero.channels.whatsapp}</span>
                </li>
                <li>
                  <InstagramIcon size={56} />
                  <span className="sr-only">{l.hero.channels.instagram}</span>
                </li>
                <li>
                  <TelegramIcon size={36} />
                  <span className="sr-only">{l.hero.channels.telegram}</span>
                </li>
              </ul>

              <h1>{l.hero.title}</h1>
              <p className="pm-hero-sub">{l.hero.subtitle}</p>

              <div className="pm-hero-actions">
                <Link className="pm-btn pm-btn-primary" href={`/${locale}/demo`} data-track-cta="hero_primary">
                  {l.hero.primaryCta}
                  <svg width="18" height="20" viewBox="0 0 14 16" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M8.035.197c.037-.263.417-.263.455 0l.098.692a6.73 6.73 0 0 0 5.101 5.6c.204.049.204.339 0 .388a6.73 6.73 0 0 0-5.101 5.6l-.098.692c-.038.263-.418.263-.455 0l-.098-.693a6.73 6.73 0 0 0-5.101-5.6c-.204-.048-.204-.338 0-.387a6.73 6.73 0 0 0 5.101-5.6zm-5.488 9.95c.032-.205.328-.205.359 0l.02.127a3.1 3.1 0 0 0 2.393 2.556c.18.04.18.294 0 .334a3.1 3.1 0 0 0-2.393 2.555l-.02.127c-.031.205-.327.205-.359 0l-.02-.127a3.1 3.1 0 0 0-2.393-2.555c-.179-.04-.179-.295 0-.335a3.1 3.1 0 0 0 2.394-2.555z"
                    />
                  </svg>
                </Link>
                <a className="pm-btn pm-btn-outline" href="#how" data-track-cta="hero_secondary">
                  {l.hero.secondaryCta}
                </a>
              </div>

              <ul className="pm-trust-row">
                <li>
                  <CheckIcon />
                  <span>{l.hero.trustBadges.one}</span>
                </li>
                <li>
                  <CheckIcon />
                  <span>{l.hero.trustBadges.two}</span>
                </li>
                <li>
                  <CheckIcon />
                  <span>{l.hero.trustBadges.three}</span>
                </li>
              </ul>
            </div>

            <div id="how" className="pm-stage-anchor">
              <ProductPreview
                copy={l.preview}
                lang={locale}
                brand={dictionary.brand}
                lobbyAlt={dictionary.alts.lobby}
              />
            </div>
          </div>
        </section>

        <section className="pm-logos">
          <div className="pm-wrap">
            <p className="pm-logos-title">{l.logos.title}</p>
            <MarketingSlider
              label={l.logos.title}
              labels={sliderLabels}
              className="pm-logos-slider"
              slidesPerView={2.2}
              spaceBetween={10}
              breakpoints={{
                480: { slidesPerView: 3.2, spaceBetween: 10 },
                760: { slidesPerView: 4.2, spaceBetween: 12 },
                1100: { slidesPerView: 6, spaceBetween: 10 },
              }}
              items={sectorItems.map((sector, idx) => ({
                key: sector,
                node: (
                  <div className="pm-logo-chip">
                    <SectorGlyph index={idx} />
                    <span>{sector}</span>
                  </div>
                ),
              }))}
            />
            <div className="pm-logos-action">
              <a href="#features" className="pm-link-arrow">
                {l.logos.link}
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="pm-section pm-bento">
          <div className="pm-wrap">
            <div className="pm-section-head">
              <h2>{l.bento.heading}</h2>
              <p>{l.bento.subheading}</p>
            </div>

            <div className="pm-bento-rows">
              <article className="pm-bento-row">
                <div className="pm-bento-copy">
                  <span className="pm-tag">{l.bento.rows.inbox.tag}</span>
                  <h3>{l.bento.rows.inbox.title}</h3>
                  <p>{l.bento.rows.inbox.body}</p>
                  <a href="#ai" className="pm-link-arrow">
                    {l.bento.rows.inbox.cta}
                  </a>
                </div>
                <div className="pm-bento-visual pm-vis-lavender">
                  <div className="pm-visual-photo">
                    <Photo
                      name="s-channel"
                      alt={dictionary.alts.two}
                      sizes="(max-width: 900px) 100vw, 520px"
                      className="pm-photo-box"
                    />
                    <div className="pm-photo-badges" aria-hidden="true">
                      <WhatsAppIcon size={24} />
                      <InstagramIcon size={24} />
                      <TelegramIcon size={24} />
                    </div>
                  </div>
                  <div className="pm-mini-card pm-mini-float">
                    <div className="pm-mini-head">
                      <span className="pm-mini-ch">
                        <WhatsAppIcon size={16} />
                        <span>{l.bento.rows.inbox.uiChannel}</span>
                      </span>
                      <span className="pm-pill-mint">{l.bento.rows.inbox.uiBadge}</span>
                    </div>
                    <div className="pm-mini-chat">
                      <p className="pm-bubble-in">{l.bento.rows.inbox.uiMsg1}</p>
                      <p className="pm-bubble-out">{l.bento.rows.inbox.uiMsg2}</p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="pm-bento-row is-reversed">
                <div className="pm-bento-copy">
                  <span className="pm-tag">{l.bento.rows.pipeline.tag}</span>
                  <h3>{l.bento.rows.pipeline.title}</h3>
                  <p>{l.bento.rows.pipeline.body}</p>
                  <a href="#contact" className="pm-link-arrow">
                    {l.bento.rows.pipeline.cta}
                  </a>
                </div>
                <div className="pm-bento-visual pm-vis-sky">
                  <div className="pm-visual-photo">
                    <Photo
                      name="p-pipeline"
                      alt={dictionary.alts.lobby}
                      sizes="(max-width: 900px) 100vw, 520px"
                      className="pm-photo-box"
                    />
                  </div>
                  <div className="pm-mini-kanban pm-mini-float">
                    <div className="pm-mini-col">
                      <strong>{l.bento.rows.pipeline.uiCol1}</strong>
                      <div className="pm-mini-deal">
                        <span>{l.bento.rows.pipeline.uiCard1}</span>
                        <span className="pm-claim-chip">{l.bento.rows.pipeline.uiClaim}</span>
                      </div>
                    </div>
                    <div className="pm-mini-col">
                      <strong>{l.bento.rows.pipeline.uiCol2}</strong>
                      <div className="pm-mini-deal">
                        <span>{l.bento.rows.pipeline.uiCard2}</span>
                        <small>{l.bento.rows.pipeline.uiOwner}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article className="pm-bento-row">
                <div className="pm-bento-copy">
                  <span className="pm-tag">{l.bento.rows.bookings.tag}</span>
                  <h3>{l.bento.rows.bookings.title}</h3>
                  <p>{l.bento.rows.bookings.body}</p>
                  <a href="#contact" className="pm-link-arrow">
                    {l.bento.rows.bookings.cta}
                  </a>
                </div>
                <div className="pm-bento-visual pm-vis-mint">
                  <div className="pm-visual-photo">
                    <Photo
                      name="p-booking"
                      alt={dictionary.alts.one}
                      sizes="(max-width: 900px) 100vw, 520px"
                      className="pm-photo-box"
                    />
                  </div>
                  <div className="pm-mini-card pm-mini-float">
                    <div className="pm-mini-head">
                      <strong>{l.bento.rows.bookings.uiGroup}</strong>
                      <span className="pm-pill-mint">{l.bento.rows.bookings.uiRule}</span>
                    </div>
                    <p className="pm-seats-line">{l.bento.rows.bookings.uiSeats}</p>
                    <div className="pm-meter">
                      <span style={{ width: "80%" }} />
                    </div>
                  </div>
                </div>
              </article>

              <article className="pm-bento-row is-reversed">
                <div className="pm-bento-copy">
                  <span className="pm-tag">{l.bento.rows.analytics.tag}</span>
                  <h3>{l.bento.rows.analytics.title}</h3>
                  <p>{l.bento.rows.analytics.body}</p>
                  <a href="#pricing" className="pm-link-arrow">
                    {l.bento.rows.analytics.cta}
                  </a>
                </div>
                <div className="pm-bento-visual pm-vis-plum">
                  <div className="pm-visual-photo">
                    <Photo
                      name="p-demo-stats"
                      alt={dictionary.alts.director}
                      sizes="(max-width: 900px) 100vw, 520px"
                      className="pm-photo-box"
                    />
                  </div>
                  <div className="pm-mini-card pm-mini-float">
                    <div className="pm-mini-stats">
                      <div>
                        <small>{l.bento.rows.analytics.uiStat1}</small>
                        <strong>{l.bento.rows.analytics.uiVal1}</strong>
                      </div>
                      <div>
                        <small>{l.bento.rows.analytics.uiStat2}</small>
                        <strong>{l.bento.rows.analytics.uiVal2}</strong>
                      </div>
                    </div>
                    <div className="pm-mini-source-row">
                      <InstagramIcon size={16} />
                      <p className="pm-mini-source">{l.bento.rows.analytics.uiSource}</p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <AiSpotlight
          eyebrow={l.ai.eyebrow}
          heading={l.ai.heading}
          subheading={l.ai.subheading}
          cta={l.ai.cta}
          badge={l.ai.badge}
          phoneBrand={l.ai.phoneBrand}
          phoneSub={l.ai.phoneSub}
          notifyAlt={dictionary.alts.three}
          items={aiItems}
        />

        <section className="pm-section pm-outcomes">
          <div className="pm-wrap">
            <div className="pm-section-head">
              <h2>{l.outcomes.heading}</h2>
              <p>{l.outcomes.subheading}</p>
            </div>

            <MarketingSlider
              label={l.outcomes.heading}
              labels={sliderLabels}
              className="pm-outcomes-slider"
              slidesPerView={1.08}
              spaceBetween={16}
              breakpoints={{
                700: { slidesPerView: 2.1, spaceBetween: 16 },
                1000: { slidesPerView: 3, spaceBetween: 18 },
              }}
              items={outcomeCards.map((card) => ({
                key: card.author,
                node: (
                  <article className="pm-outcome-card">
                    <blockquote>
                      {card.before}
                      <mark className="pm-mint-mark">{card.highlight}</mark>
                      {card.after}
                    </blockquote>
                    <footer className="pm-outcome-meta">
                      <Photo
                        name={card.photo}
                        alt={card.alt}
                        sizes="48px"
                        className="pm-outcome-avatar"
                      />
                      <div>
                        <strong>{card.author}</strong>
                        <span>{card.role}</span>
                      </div>
                    </footer>
                  </article>
                ),
              }))}
            />

            <div className="pm-outcomes-cta">
              <a href="#contact" className="pm-btn pm-btn-outline">
                {l.outcomes.cta}
              </a>
            </div>
          </div>
        </section>

        <PricingShowcase
          heading={l.pricing.heading}
          subheading={l.pricing.subheading}
          periods={l.pricing.periods}
          periodNotes={l.pricing.periodNotes}
          perMonth={l.pricing.perMonth}
          popularLabel={l.pricing.popular}
          setupPrefix={l.pricing.setupPrefix}
          setupValue={l.pricing.setupValue}
          plans={pricingPlans}
          footnote={l.pricing.footnote}
        />

        <section id="faq" className="pm-section pm-faq">
          <div className="pm-wrap pm-faq-inner">
            <div className="pm-section-head">
              <h2>{dictionary.faq.title}</h2>
            </div>

            <div className="pm-faq-list">
              {faqEntries.map(([id, item]) => (
                <details key={id} data-track-faq={id} className="pm-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="pm-cta-band">
          <div className="pm-cta-glow" aria-hidden="true" />
          <div className="pm-cta-bg-photo" aria-hidden="true">
            <Photo name="p-product-tour" alt="" sizes="100vw" className="pm-cta-bg-img" />
          </div>
          <div className="pm-wrap pm-cta-grid">
            <div className="pm-cta-copy">
              <h2>{l.ctaBand.title}</h2>
              <p>{l.ctaBand.subtitle}</p>
              <div className="pm-cta-links">
                <Link href={`/${locale}/login`} className="pm-btn pm-btn-mint">
                  {l.ctaBand.secondary}
                </Link>
              </div>
            </div>

            <div className="pm-contact-card">
              <LeadForm
                locale={locale}
                labels={dictionary.contact}
                okText={dictionary.contact.ok}
                errText={dictionary.contact.error}
                rateLimitedText={dictionary.contact.rate_limited}
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter
        lang={locale}
        other={other}
        tagline={l.footer.tagline}
        copyright={l.footer.copyright}
        switchLabel={l.footer.switchLabel}
        cols={dictionary.subpages.footer}
      />

      <AnalyticsTracker locale={locale} />
    </div>
  );
}
