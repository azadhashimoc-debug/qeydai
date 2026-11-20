"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";
import { errorCopyFor } from "./error-copy";

export default function LocaleError({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang === "en" ? "en" : "az";
  const t = errorCopyFor(lang);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-start justify-center px-5 py-20">
      <p className="text-sm font-semibold text-danger">{t.label}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-[46ch] text-muted">{t.body}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className={buttonClass()}
        >
          {t.reset ?? t.retry}
        </button>
        <Link
          href={`/${lang}`}
          className={buttonClass({ variant: "secondary" })}
        >
          {t.home}
        </Link>
      </div>
    </main>
  );
}
