export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill="#0B1530" />
      <circle cx="30" cy="30" r="14" fill="none" stroke="#F5F7FB" strokeWidth="6" />
      <circle cx="45" cy="45" r="6" fill="#12C2B0" />
    </svg>
  );
}
