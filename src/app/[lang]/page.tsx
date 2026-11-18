import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Photo } from "@/components/Photo";
import { SeatBoard } from "@/components/SeatBoard";
import { getDictionary, locales } from "./dictionaries";
import { LeadForm } from "./LeadForm";

const featureKeys = ["enroll", "inbox", "crm", "human", "tenant"] as const;
const stepKeys = ["one", "two", "three"] as const;
const stepPhoto = { one: "s-courses", two: "s-channel", three: "s-notify" } as const;
const faqKeys = ["q1", "q2", "q3", "q4", "q5"] as const;

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const other = locales.find((l) => l !== lang)!;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href={`/${lang}`} className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
            <LogoMark />
            {d.brand}
          </Link>
          <div className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-ink">{d.nav.features}</a>
            <a href="#how" className="hover:text-ink">{d.nav.how}</a>
            <a href="#pricing" className="hover:text-ink">{d.nav.pricing}</a>
            <a href="#faq" className="hover:text-ink">{d.nav.faq}</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${other}`}
              hrefLang={other}
              aria-label={`${d.footer.lang}: ${other.toUpperCase()}`}
              className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold uppercase text-muted hover:text-ink"
            >
              {other}
            </Link>
            <a href="#contact" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
              {d.nav.cta}
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero: the product's own object (seats filling up) is the first thing seen */}
        <section className="relative overflow-hidden bg-navy text-white">
          <div aria-hidden className="hero-field absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:py-24">
            <div>
              <p className="mb-5 text-sm font-medium text-accent">{d.hero.eyebrow}</p>
              <h1 className="max-w-[16ch] text-[clamp(2.5rem,6.2vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-balance">
                {d.hero.title}
              </h1>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/72">{d.hero.subtitle}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#contact" className="rounded-xl bg-brand px-6 py-3.5 font-semibold hover:brightness-110">{d.hero.primary}</a>
                <a href="#how" className="rounded-xl border border-white/22 px-6 py-3.5 font-semibold text-white/90 hover:bg-white/6">{d.hero.secondary}</a>
              </div>
              <ul className="mt-11 flex flex-wrap gap-x-7 gap-y-2 text-sm text-white/62">
                {[d.proof.one, d.proof.two, d.proof.three].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span aria-hidden className="seat seat--taken" style={{ width: 9, height: 9 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <SeatBoard d={d.board} />
          </div>
        </section>

        {/* The problem, as two timelines on one clock */}
        <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
          <p className="text-sm text-muted">{d.story.label}</p>
          <h2 className="mt-2 max-w-[22ch] text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">{d.story.title}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <h3 className="mb-4 font-semibold text-muted">{d.story.without.name}</h3>
              <ol className="rail rail--lost">
                <li>{d.story.without.a}</li>
                <li>{d.story.without.b}</li>
                <li className="font-semibold">{d.story.without.c}</li>
              </ol>
            </div>
            <div>
              <h3 className="mb-4 font-semibold">{d.story.with.name}</h3>
              <ol className="rail rail--won">
                <li>{d.story.with.a}</li>
                <li>{d.story.with.b}</li>
                <li className="font-semibold">{d.story.with.c}</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Features: one lead capability with a real exchange, the rest as plain rows */}
        <section id="features" className="scroll-mt-16 border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[1fr_1.1fr] md:py-24">
            <div>
              <h2 className="max-w-[18ch] text-3xl font-semibold leading-tight tracking-tight text-balance md:text-4xl">{d.features.title}</h2>
              <div className="mt-8 rounded-2xl border border-white/12 bg-navy p-5 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
                <p className="mb-1 text-sm font-semibold text-accent">{d.features.items.ai.title}</p>
                <p className="mb-4 text-sm text-white/65">{d.features.items.ai.body}</p>
                <div className="grid gap-2 text-sm">
                  <p className="max-w-[85%] justify-self-end rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5">{d.features.sample.u}</p>
                  <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white/10 px-3.5 py-2.5">{d.features.sample.b}</p>
                </div>
                <p className="mt-3 text-xs text-white/45">{d.features.sample.note}</p>
              </div>
            </div>
            <ul className="divide-y divide-line self-center">
              {featureKeys.map((k) => (
                <li key={k} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                  <span aria-hidden className="seat mt-1.5 shrink-0" style={{ borderColor: "var(--teal)" }} />
                  <div>
                    <h3 className="font-semibold">{d.features.items[k].title}</h3>
                    <p className="mt-1 max-w-[52ch] text-muted">{d.features.items[k].body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works: a genuine sequence, so it is numbered */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-20 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{d.how.title}</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {stepKeys.map((k, i) => (
              <li key={k}>
                <Photo name={stepPhoto[k]} alt={d.alts[k]} className="aspect-[4/3] rounded-2xl" sizes="(min-width: 768px) 33vw, 100vw" />
                <p className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-3xl font-semibold text-accent">{i + 1}</span>
                  <span className="text-lg font-semibold">{d.how.steps[k].title}</span>
                </p>
                <p className="mt-2 max-w-[40ch] text-muted">{d.how.steps[k].body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing as a plain ledger, not a pair of cards */}
        <section id="pricing" className="scroll-mt-16 border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_1.2fr] md:py-24">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{d.pricing.title}</h2>
              <p className="mt-3 max-w-[40ch] text-sm text-muted">{d.pricing.note}</p>
            </div>
            <dl className="divide-y divide-line border-y border-line">
              {([d.pricing.setup, d.pricing.monthly] as const).map((p) => (
                <div key={p.label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-6">
                  <dt className="font-semibold">{p.label}</dt>
                  <dd className="font-display text-3xl font-semibold tracking-tight">{p.value}</dd>
                  <p className="col-span-2 max-w-[48ch] text-muted">{p.body}</p>
                </div>
              ))}
              <p className="py-5 text-sm text-muted">{d.pricing.extra}</p>
            </dl>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-5 py-20 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{d.faq.title}</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {faqKeys.map((k) => (
              <details key={k} className="group py-5">
                <summary className="text-lg font-semibold">{d.faq.items[k].q}</summary>
                <p className="mt-3 max-w-[60ch] text-muted">{d.faq.items[k].a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="contact" className="relative scroll-mt-16 overflow-hidden bg-navy text-white">
          <Photo name="w-classroom-dusk" className="absolute inset-0 opacity-25" sizes="100vw" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:py-24">
            <div>
              <h2 className="max-w-[16ch] text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">{d.contact.title}</h2>
              <p className="mt-4 max-w-[42ch] text-white/72">{d.contact.subtitle}</p>
            </div>
            <div className="rounded-2xl bg-bg p-6 text-ink">
              <LeadForm labels={d.contact} okText={d.contact.ok} errText={d.contact.error} rateLimitedText={d.contact.rate_limited} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 pb-24 md:pb-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-sm text-muted">
          <span className="flex items-center gap-2"><LogoMark size={20} />{d.brand}</span>
          <span>{d.footer.tagline}</span>
        </div>
      </footer>

      <a
        href="#contact"
        className="fixed inset-x-4 bottom-4 z-20 rounded-xl bg-brand py-3.5 text-center font-semibold text-white shadow-lg md:hidden"
      >
        {d.nav.cta}
      </a>
    </>
  );
}
