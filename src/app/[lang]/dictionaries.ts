import { notFound } from "next/navigation";

const dictionaries = {
  az: () => import("./dictionaries/az.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;
export const locales = Object.keys(dictionaries) as Locale[];
export const hasLocale = (l: string): l is Locale => l in dictionaries;

export async function getDictionary(lang: string) {
  if (!hasLocale(lang)) notFound();
  return dictionaries[lang]();
}
