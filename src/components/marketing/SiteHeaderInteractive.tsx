"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type HeaderDropdownItem = {
  href: string;
  title: string;
  desc?: string;
};

export type HeaderDropdownGroup = {
  id: string;
  label: string;
  items: HeaderDropdownItem[];
};

export function NavDropdown({ group }: { group: HeaderDropdownGroup }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={open ? "pm-dropdown is-open" : "pm-dropdown"}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="pm-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{group.label}</span>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="pm-dropdown-panel" role="menu">
          {group.items.map((item) => (
            <Link
              key={item.href + item.title}
              href={item.href}
              role="menuitem"
              className="pm-dropdown-item"
              onClick={() => setOpen(false)}
            >
              <strong>{item.title}</strong>
              {item.desc && <span>{item.desc}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeaderMobileMenu({
  groups,
  directLinks,
  loginLabel,
  loginHref,
  registerLabel,
  registerHref,
  demoLabel,
  demoHref,
  menuOpenLabel,
  menuCloseLabel,
}: {
  groups: HeaderDropdownGroup[];
  directLinks: { href: string; label: string }[];
  loginLabel: string;
  loginHref: string;
  registerLabel: string;
  registerHref: string;
  demoLabel: string;
  demoHref: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pm-mobile-nav">
      <button
        type="button"
        className="pm-burger"
        aria-expanded={open}
        aria-label={open ? menuCloseLabel : menuOpenLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div className="pm-mobile-drawer pm-mobile-drawer-rich">
          {groups.map((group) => (
            <div key={group.id} className="pm-mobile-group">
              <p className="pm-mobile-group-title">{group.label}</p>
              <nav className="pm-mobile-links">
                {group.items.map((item) => (
                  <Link key={item.href + item.title} href={item.href} onClick={() => setOpen(false)}>
                    {item.title}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          {directLinks.length > 0 && (
            <nav className="pm-mobile-links">
              {directLinks.map((item) => (
                <Link key={item.href + item.label} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="pm-mobile-actions">
            <Link href={loginHref} className="pm-btn pm-btn-outline" onClick={() => setOpen(false)}>
              {loginLabel}
            </Link>
            <Link href={registerHref} className="pm-btn pm-btn-outline" onClick={() => setOpen(false)}>
              {registerLabel}
            </Link>
            <Link
              href={demoHref}
              data-track-cta="mobile_sticky"
              className="pm-btn pm-btn-primary"
              onClick={() => setOpen(false)}
            >
              {demoLabel}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
