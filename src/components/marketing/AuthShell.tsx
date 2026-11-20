"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";

export type AuthShellCopy = {
  brandName: string;
  switchHref: string;
  switchLabel: string;
  switchVariant: "filled" | "outline";
  homeHref: string;
  closeLabel: string;
  speechText: string;
  chatLabel: string;
  chatHref: string;
  bannerText: string;
  bannerHref: string;
  dismissLabel: string;
  magnifierAlt: string;
  heartAlt: string;
};

/**
 * Distraction-free authentication layout with brand header, Flow-generated
 * 3D mascot illustrations, support bubble, and dismissible announcement strip.
 */
export function AuthShell({
  copy,
  children,
}: {
  copy: AuthShellCopy;
  children: ReactNode;
}) {
  const [bannerOpen, setBannerOpen] = useState(true);

  return (
    <div className="pm-auth-page">
      <header className="pm-auth-topbar">
        <Link href={copy.homeHref} className="pm-auth-brand">
          <LogoMark size={26} />
          <span>{copy.brandName}</span>
        </Link>

        <div className="pm-auth-top-actions">
          <Link
            href={copy.switchHref}
            className={
              copy.switchVariant === "filled"
                ? "pm-auth-top-btn is-filled"
                : "pm-auth-top-btn is-outline"
            }
          >
            {copy.switchLabel}
          </Link>
          <Link
            href={copy.homeHref}
            className="pm-auth-close"
            aria-label={copy.closeLabel}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="pm-auth-stage">
        <div className="pm-auth-mascot pm-auth-mascot-left" aria-hidden="true">
          <div className="pm-auth-speech">
            <span>{copy.speechText}</span>
          </div>
          <div className="pm-auth-mascot-img-wrap">
            <Image
              src="/images/auth-mascot-magnifier.webp"
              alt={copy.magnifierAlt}
              width={220}
              height={198}
              priority
              className="pm-auth-mascot-img"
            />
          </div>
        </div>

        <div className="pm-auth-center">{children}</div>

        <div className="pm-auth-mascot pm-auth-mascot-right" aria-hidden="true">
          <Image
            src="/images/auth-mascot-heart.webp"
            alt={copy.heartAlt}
            width={240}
            height={224}
            priority
            className="pm-auth-mascot-img"
          />
        </div>

        <Link
          href={copy.chatHref}
          className="pm-auth-chat-fab"
          aria-label={copy.chatLabel}
          title={copy.chatLabel}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </Link>
      </main>

      {bannerOpen && (
        <aside className="pm-auth-banner" aria-label={copy.bannerText}>
          <Link href={copy.bannerHref} className="pm-auth-banner-link">
            <span className="pm-auth-banner-icon" aria-hidden="true">📢</span>
            <span>{copy.bannerText}</span>
          </Link>
          <button
            type="button"
            className="pm-auth-banner-close"
            onClick={() => setBannerOpen(false)}
            aria-label={copy.dismissLabel}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </aside>
      )}
    </div>
  );
}
