"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type WorkspaceItem = {
  id: string;
  name: string;
  role: string;
};

type SelectAccountClientProps = {
  lang: "az" | "en";
  skipToMain?: string;
  title: string;
  subtitle: string;
  badge: string;
  closeLabel: string;
  switchAccount: string;
  createAccount: string;
  partnerPortal: string;
  signOut: string;
  noWorkspaces: string;
  createWorkspace: string;
  demoAccount: string;
  loginAccount: string;
  createAccountTitle: string;
  planLabel?: string;
  seatsLabel?: string;
};

export function SelectAccountClient({
  lang,
  skipToMain,
  title,
  subtitle,
  badge,
  closeLabel,
  switchAccount,
  createAccount,
  partnerPortal,
  signOut,
  noWorkspaces,
  createWorkspace,
  demoAccount,
  loginAccount,
  createAccountTitle,
}: SelectAccountClientProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSessionWorkspace() {
      try {
        const authRes = await fetch("/api/panel/auth", {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!authRes.ok || controller.signal.aborted) return;
        const wsRes = await fetch("/api/panel/workspace", {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!wsRes.ok || controller.signal.aborted) return;
        const data = (await wsRes.json()) as {
          ok?: boolean;
          workspace?: { id: string; name: string };
          actor?: { role?: string };
        };
        if (data.ok && data.workspace) {
          setWorkspace({
            id: data.workspace.id,
            name: data.workspace.name,
            role: data.actor?.role ?? "member",
          });
        }
      } catch {
        // Unauthenticated or aborted: show empty-workspace actions cleanly.
      }
    }
    void loadSessionWorkspace();
    return () => controller.abort();
  }, []);

  const handleSelect = () => {
    router.push(`/${lang}/panel`);
  };

  async function handleSignOut() {
    await fetch("/api/panel/auth", {
      method: "DELETE",
      credentials: "same-origin",
    }).catch(() => undefined);
    setWorkspace(null);
    router.push(`/${lang}/login`);
  }

  const displayName = workspace?.name ?? "panelim.az";
  const displayMeta = workspace
    ? workspace.id
    : lang === "en"
      ? "Not signed in"
      : "Daxil olunmayıb";
  const avatarInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "PA";

  return (
    <div className="marketing pm-select-account">
      <a href="#main" className="skip-link">
        {skipToMain ?? (lang === "en" ? "Skip to main content" : "Əsas məzmuna keç")}
      </a>

      <header className="pm-select-account-header">
        <Link href={`/${lang}`} className="pm-select-account-brand">
          <span className="pm-select-account-logo">panelim</span>
          <span className="pm-select-account-dot">.az</span>
        </Link>
        <div className="pm-select-account-actions">
          <Link
            href={`/${lang}`}
            className="pm-select-account-close"
            aria-label={closeLabel}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <aside className="pm-select-account-sidebar">
          <div className="pm-select-account-user">
            <div className="pm-select-account-avatar">{avatarInitials}</div>
            <div className="pm-select-account-info">
              <strong className="pm-select-account-user-name">{displayName}</strong>
              <span className="pm-select-account-user-email">{displayMeta}</span>
            </div>
          </div>

          <nav className="pm-select-account-nav">
            <button type="button" className="pm-select-account-nav-item" onClick={() => router.push(`/${lang}/select-account`)}>
              {switchAccount}
            </button>
            <button type="button" className="pm-select-account-nav-item" onClick={() => router.push(`/${lang}/register`)}>
              {createAccount}
            </button>
            <Link href={`/${lang}/partners`} className="pm-select-account-nav-item">
              {partnerPortal}
            </Link>
            {workspace !== null && (
              <button
                type="button"
                className="pm-select-account-nav-item pm-select-account-nav-item--danger"
                onClick={() => void handleSignOut()}
              >
                {signOut}
              </button>
            )}
          </nav>
        </aside>

        <section className="pm-select-account-main">
          {workspace === null ? (
            <div className="pm-select-account-empty">
              <span className="pm-select-account-badge">{badge}</span>
              <h1 className="pm-select-account-title">{title}</h1>
              <p className="pm-select-account-subtitle">{subtitle}</p>
              <div className="pm-select-account-empty-actions">
                <Link href={`/${lang}/demo`} className="pm-select-account-empty-demo">
                  <span className="pm-select-account-empty-globe">🌐</span>
                  {demoAccount}
                </Link>
                <Link href={`/${lang}/login`} className="pm-select-account-empty-login">
                  {loginAccount}
                </Link>
                <button type="button" className="pm-select-account-empty-create" onClick={() => router.push(`/${lang}/register`)}>
                  {createAccountTitle}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="pm-select-account-copy">
                <span className="pm-select-account-badge">{badge}</span>
                <h1 className="pm-select-account-title">{title}</h1>
                <p className="pm-select-account-subtitle">{subtitle}</p>
              </div>

              <button type="button" className="pm-select-account-card" onClick={handleSelect}>
                <span className="pm-select-account-card-action">{workspace.role}</span>
                <div className="pm-select-account-card-head">
                  <strong className="pm-select-account-card-name">{workspace.name}</strong>
                  <span className="pm-select-account-card-email">{workspace.id}</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pm-select-account-card-arrow">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <div className="pm-select-account-footer">
                <p className="pm-select-account-footer-note">{noWorkspaces}</p>
                <button type="button" className="pm-select-account-footer-btn" onClick={() => router.push(`/${lang}/register`)}>
                  {createWorkspace}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
