// Single source for button/CTA styling. Six call sites had drifted copies of the same class string.
// Returns class names only, so it works on <button>, <a> and next/link alike.
// Display (inline-block, w-full, ...) and spacing are left to the caller.

export type ButtonVariant = "primary" | "secondary" | "ghostOnDark";
export type ButtonSize = "sm" | "md" | "lg";

const base = "rounded-md font-semibold transition-[filter,border-color,background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:brightness-110",
  secondary: "border border-line bg-surface text-ink hover:border-brand",
  ghostOnDark: "border border-white/25 text-white/95 hover:bg-white/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm sm:px-4",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5",
};

export function buttonClass({ variant = "primary", size = "md", className = "" }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}
