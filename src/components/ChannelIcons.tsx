export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#25D366" />
      <path
        d="M12 5.4a6.5 6.5 0 0 0-5.6 9.8l-.8 2.9 3-.8A6.5 6.5 0 1 0 12 5.4Zm3.7 9.1c-.16.45-.92.86-1.28.91-.33.05-.75.07-1.22-.08-.29-.09-.66-.21-1.13-.41-1.99-.86-3.29-2.86-3.39-3-.1-.13-.81-1.08-.81-2.06 0-.98.51-1.46.7-1.66.18-.2.4-.25.54-.25h.39c.13 0 .3-.05.47.36.18.43.6 1.48.66 1.59.05.11.09.24.02.38-.07.14-.11.23-.21.35-.1.12-.21.26-.3.35-.1.1-.2.21-.09.41.12.2.52.85 1.11 1.38.77.68 1.41.89 1.61.99.2.1.32.08.44-.05.12-.13.5-.58.63-.78.13-.2.27-.17.45-.1.18.07 1.18.56 1.38.66.2.1.34.15.39.23.05.08.05.49-.11.94Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="pm-ig-grad" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F58529" />
          <stop offset="0.5" stopColor="#DD2A7B" />
          <stop offset="1" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill="url(#pm-ig-grad)" />
      <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="3.4" stroke="#FFFFFF" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.8" stroke="#FFFFFF" strokeWidth="1.6" />
      <circle cx="15.7" cy="8.3" r="0.9" fill="#FFFFFF" />
    </svg>
  );
}

export function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#2AABEE" />
      <path
        d="M17.4 7.3 5.9 11.7c-.78.31-.77.75-.14.95l2.95.92 6.83-4.31c.32-.2.62-.09.38.12l-5.53 5-.21 3.07c.31 0 .45-.14.62-.3l1.49-1.45 3.1 2.29c.57.31.98.15 1.12-.53l2.03-9.57c.2-.83-.32-1.2-.94-.89Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function SectorGlyph({ index }: { index: number }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (index % 6) {
    case 0:
      return (
        <svg {...props}>
          <path d="M3 6.5 10 3.5l7 3-7 3-7-3Z" />
          <path d="M5.5 8.5v4.2c0 1.4 2 2.5 4.5 2.5s4.5-1.1 4.5-2.5V8.5" />
        </svg>
      );
    case 1:
      return (
        <svg {...props}>
          <path d="M4 4.5h5.5a2 2 0 0 1 2 2v9.5H6a2 2 0 0 0-2 2V4.5Z" />
          <path d="M16 4.5h-4.5a2 2 0 0 0-2 2v9.5H14a2 2 0 0 1 2 2V4.5Z" />
        </svg>
      );
    case 2:
      return (
        <svg {...props}>
          <rect x="3" y="4" width="14" height="10" rx="2" />
          <path d="M7.5 17h5M10 14v3" />
        </svg>
      );
    case 3:
      return (
        <svg {...props}>
          <path d="M10 3.5v13M3.5 10h13" />
          <circle cx="10" cy="10" r="7" />
        </svg>
      );
    case 4:
      return (
        <svg {...props}>
          <rect x="3.5" y="5" width="13" height="10.5" rx="2" />
          <path d="M7.5 5V3.5h5V5M3.5 9.5h13" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M4.5 6.5h12l-1.2 6.5H5.7L4.5 6.5Z" />
          <circle cx="7.5" cy="16" r="1.2" />
          <circle cx="13.5" cy="16" r="1.2" />
        </svg>
      );
  }
}
