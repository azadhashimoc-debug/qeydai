import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { Photo } from "@/components/Photo";
import { BLOG_SLUGS, type BlogSlug } from "@/lib/marketing/catalog";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../dictionaries";
import "../marketing.css";

const BLOG_IMAGES: Record<BlogSlug, string> = {
  "whatsapp-automation": "p-blog-1",
  "instagram-dm-sales": "p-blog-2",
  "appointment-crm": "p-cases",
  "ai-reply-workflows": "p-ai-copilot",
  "telegram-lead-capture": "p-telegram",
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/blog">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: "/blog",
    title: d.subpages.blogHub.hero.title,
    description: d.subpages.blogHub.hero.subtitle,
    brand: d.brand,
    image: "/images/p-blog-1.webp",
  });
}

export default async function BlogHubPage({ params }: PageProps<"/[lang]/blog">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;

  return (
    <div className="marketing">
      <a href="#main" className="skip-link">
        {d.a11y.skipToMain}
      </a>

      <SiteHeader
        lang={locale}
        brand={d.brand}
        a11y={d.a11y}
        nav={d.landing.nav}
        subNav={s.navGroups}
        mode="subpage"
        routeSuffix="/blog"
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={s.blogHub.hero.badge}
          title={s.blogHub.hero.title}
          subtitle={s.blogHub.hero.subtitle}
          primaryCta={{ href: "#blog-list", label: s.blogHub.hero.ctaPrimary }}
          secondaryCta={{ href: `/${locale}/tools`, label: s.blogHub.hero.ctaSecondary }}
          image="p-blog-1"
          imageAlt={s.blogHub.hero.title}
        />

        <section id="blog-list" className="pm-section">
          <div className="pm-wrap">
            <div className="pm-feature-grid pm-cols-3">
              {BLOG_SLUGS.map((slug) => {
                const post = s.blogPosts[slug];
                return (
                  <article key={slug} className="pm-blog-card">
                    <Photo
                      name={BLOG_IMAGES[slug]}
                      alt={post.title}
                      sizes="(max-width: 900px) 100vw, 360px"
                      className="pm-blog-thumb"
                    />
                    <div className="pm-blog-meta">
                      <span>{post.date}</span>
                      <span>
                        {post.readTime} {s.blogHub.readingTime}
                      </span>
                    </div>
                    <h3>{post.title}</h3>
                    <p style={{ color: "var(--pm-muted)", lineHeight: 1.55, flex: 1 }}>
                      {post.excerpt}
                    </p>
                    <Link href={`/${locale}/blog/${slug}`} className="pm-link-arrow">
                      {s.common.readGuide}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <BottomCtaBand
          title={s.common.bottomCta.title}
          subtitle={s.common.bottomCta.subtitle}
          primaryHref={`/${locale}/demo`}
          primaryLabel={s.common.bottomCta.primary}
          secondaryHref={`/${locale}/login`}
          secondaryLabel={s.common.bottomCta.secondary}
        />
      </main>

      <SiteFooter
        lang={locale}
        other={other}
        tagline={d.landing.footer.tagline}
        copyright={d.landing.footer.copyright}
        switchLabel={d.landing.footer.switchLabel}
        cols={s.footer}
        routeSuffix="/blog"
      />
    </div>
  );
}
