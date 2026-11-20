import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

/**
 * Renders /public/images/<name>.webp when it exists, otherwise a quiet gradient placeholder,
 * so the page never shows a broken image while photos are being produced.
 */
export function Photo({ name, alt = "", className = "", sizes = "100vw", priority = false }: {
  name: string; alt?: string; className?: string; sizes?: string; priority?: boolean;
}) {
  const exists = fs.existsSync(path.join(process.cwd(), "public", "images", `${name}.webp`));
  if (!exists) {
    return <div aria-hidden className={`photo-placeholder ${className}`} />;
  }
  const pos = /\b(absolute|fixed|sticky|static)\b/.test(className) ? "" : "relative ";
  return (
    <div className={`${pos}overflow-hidden ${className}`}>
      <Image src={`/images/${name}.webp`} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
