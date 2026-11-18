import { notFound } from "next/navigation";

const dictionaries = {
  az: async () => {
    const [base, subpages] = await Promise.all([
      import("./dictionaries/az.json").then((m) => m.default),
      import("./dictionaries/subpages-az.json").then((m) => m.default),
    ]);
    return { ...base, subpages };
  },
  en: async () => {
    const [base, subpages] = await Promise.all([
      import("./dictionaries/en.json").then((m) => m.default),
      import("./dictionaries/subpages-en.json").then((m) => m.default),
    ]);
    return { ...base, subpages };
  },
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["az"]>>;
export type SubpagesDict = Dictionary["subpages"];

export type Locale = keyof typeof dictionaries;
export const locales = Object.keys(dictionaries) as Locale[];
export const hasLocale = (l: string): l is Locale => Object.hasOwn(dictionaries, l);

export async function getDictionary(lang: string) {
  if (!hasLocale(lang)) notFound();
  return dictionaries[lang]();
}
