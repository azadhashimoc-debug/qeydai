import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BottomCtaBand, SubpageHero } from "@/components/marketing/SubpageBlocks";
import { BLOG_SLUGS, type BlogSlug, isBlogSlug } from "@/lib/marketing/catalog";
import { buildSubpageMetadata } from "@/lib/marketing/metadata";
import { getDictionary, locales } from "../../dictionaries";
import "../../marketing.css";

const BLOG_IMAGES: Record<BlogSlug, string> = {
  "whatsapp-automation": "p-blog-1",
  "instagram-dm-sales": "p-blog-2",
  "appointment-crm": "blog-cover-1",
  "ai-reply-workflows": "p-ai-copilot",
  "telegram-lead-capture": "p-telegram",
};

export function generateStaticParams() {
  return locales.flatMap((lang) => BLOG_SLUGS.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/blog/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isBlogSlug(slug)) notFound();
  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const post = d.subpages.blogPosts[slug];
  return buildSubpageMetadata({
    lang: locale,
    routeSuffix: `/blog/${slug}`,
    title: post.title,
    description: post.excerpt,
    brand: d.brand,
    image: `/images/${BLOG_IMAGES[slug]}.webp`,
  });
}

export default async function BlogPostPage({
  params,
}: PageProps<"/[lang]/blog/[slug]">) {
  const { lang, slug } = await params;
  if (!isBlogSlug(slug)) notFound();

  const d = await getDictionary(lang);
  const locale = lang === "en" ? "en" : "az";
  const other = locale === "az" ? "en" : "az";
  const s = d.subpages;
  const post = s.blogPosts[slug];

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
        routeSuffix={`/blog/${slug}`}
      />

      <main id="main" tabIndex={-1}>
        <SubpageHero
          badge={`${post.category} · ${post.readTime}`}
          title={post.title}
          subtitle={post.excerpt}
          primaryCta={{ href: `/${locale}/demo`, label: s.common.bookDemo }}
          secondaryCta={{ href: `/${locale}/blog`, label: s.common.backToBlog }}
          image={BLOG_IMAGES[slug]}
          imageAlt={post.title}
        />

        <section className="pm-section">
          <div className="pm-wrap">
            <article className="pm-article-body">
              {post.body.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div style={{ marginTop: 12 }}>
                <Link href={`/${locale}/blog`} className="pm-link-arrow">
                  {s.common.backToBlog}
                </Link>
              </div>
            </article>
          </div>
        </section>

        <BottomCtaBand
          title={s.common.bottomCta.title}
          subtitle={s.common.bottomCta.subtitle}
          primaryHref={`/${locale}/demo`}
          primaryLabel={s.common.bottomCta.primary}
          secondaryHref={`/${locale}/pricing`}
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
        routeSuffix={`/blog/${slug}`}
      />
    </div>
  );
}
