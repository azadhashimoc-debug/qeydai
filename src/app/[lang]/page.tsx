import Link from "next/link";
import { getDictionary, locales } from "./dictionaries";
import { LeadForm } from "./LeadForm";

const featureKeys = ["ai", "inbox", "enroll", "crm", "human", "tenant"] as const;
const stepKeys = ["one", "two", "three"] as const;

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const d = await getDictionary(lang);
  const other = locales.find((l) => l !== lang)!;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href={`/${lang}`} className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-brand text-sm font-bold text-white">Q</span>
            {d.brand}
          </Link>
          <div className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-ink">{d.nav.features}</a>
            <a href="#how" className="hover:text-ink">{d.nav.how}</a>
            <a href="#pricing" className="hover:text-ink">{d.nav.pricing}</a>
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
        <section className="bg-navy text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
            <div>
              <p className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-accent">
                {d.hero.eyebrow}
              </p>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-balance md:text-6xl">{d.hero.title}</h1>
              <p className="mt-5 max-w-xl text-lg text-white/70">{d.hero.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#contact" className="rounded-xl bg-brand px-6 py-3 font-semibold hover:brightness-110">{d.hero.primary}</a>
                <a href="#how" className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white/90 hover:bg-white/5">{d.hero.secondary}</a>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                {[d.proof.one, d.proof.two, d.proof.three].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <figure aria-label={d.demo.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
              <figcaption className="mb-3 flex items-center justify-between text-xs text-white/50">
                <span>{d.demo.title}</span>
                <span>{d.demo.note}</span>
              </figcaption>
              <div className="grid gap-2.5 text-sm">
                <p className="max-w-[80%] justify-self-end rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5">{d.demo.u1}</p>
                <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white/10 px-3.5 py-2.5">{d.demo.b1}</p>
                <p className="max-w-[80%] justify-self-end rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5">{d.demo.u2}</p>
                <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white/10 px-3.5 py-2.5">{d.demo.b2}</p>
                <div className="mt-1 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-3">
                  <span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent font-bold text-navy">✓</span>
                  <div>
                    <p className="font-semibold">{d.demo.card}</p>
                    <p className="text-xs text-white/60">{d.demo.card2}</p>
                  </div>
                </div>
              </div>
            </figure>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-20">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">{d.features.title}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((k) => (
              <article key={k} className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="font-semibold">{d.features.items[k].title}</h3>
                <p className="mt-2 text-muted">{d.features.items[k].body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-16 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{d.how.title}</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {stepKeys.map((k, i) => (
                <li key={k}>
                  <span className="font-mono text-sm text-accent">0{i + 1}</span>
                  <h3 className="mt-2 text-lg font-semibold">{d.how.steps[k].title}</h3>
                  <p className="mt-2 text-muted">{d.how.steps[k].body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{d.pricing.title}</h2>
          <p className="mt-2 text-sm text-muted">{d.pricing.note}</p>
          <div className="mt-8 grid gap-4 md:max-w-3xl md:grid-cols-2">
            {([d.pricing.setup, d.pricing.monthly] as const).map((p) => (
              <div key={p.label} className="rounded-2xl border border-line bg-surface p-6">
                <p className="text-sm text-muted">{p.label}</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight">{p.value}</p>
                <p className="mt-3 text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="scroll-mt-16 bg-navy text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{d.contact.title}</h2>
              <p className="mt-3 text-white/70">{d.contact.subtitle}</p>
            </div>
            <div className="rounded-2xl bg-bg p-6 text-ink">
              <LeadForm labels={d.contact} okText={d.contact.ok} errText={d.contact.error} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        {d.brand} · {d.footer.tagline}
      </footer>
    </>
  );
}
