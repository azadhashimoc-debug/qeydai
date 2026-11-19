"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// Demo flow: mock iş sahesi listesi. Gerçek akışta bu auth oturumundan gelir.
const WORKSPACES = [
  { id: "ws-1", name: "Məhsul Satış Mərkəzi", email: "sales@demo.az", plan: "Premium", seats: "12 fəaliyyətçi" },
  { id: "ws-2", name: "Əməliyyat Mərkəzi", email: "ops@demo.az", plan: "Standart", seats: "5 fəaliyyətçi" },
  { id: "ws-3", name: "Test İş Sahəsi", email: "test@demo.az", plan: "Sınaq", seats: "2 fəaliyyəçi" },
];

const USER_NAME = "Adem Novruzlu";
const USER_EMAIL = "adem@example.com";

type SelectAccountClientProps = {
  lang: "az" | "en";
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
  planLabel?: string;
  seatsLabel?: string;
};

export function SelectAccountClient({
  lang,
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
}: SelectAccountClientProps) {
  const router = useRouter();

  const handleSelect = (id: string) => {
    router.push(`/${lang}/panel?ws=${id}`);
  };

  return (
    <div className="marketing pm-select-account">
      <a href="#main" className="skip-link">Əsas məskuja keç</a>

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
            <div className="pm-select-account-avatar">AN</div>
            <div className="pm-select-account-info">
              <strong className="pm-select-account-user-name">{USER_NAME}</strong>
              <span className="pm-select-account-user-email">{USER_EMAIL}</span>
            </div>
          </div>

          <nav className="pm-select-account-nav">
            <button type="button" className="pm-select-account-nav-item" onClick={() => router.push(`/${lang}/select-account`)}>
              {switchAccount}
            </button>
            <button type="button" className="pm-select-account-nav-item" onClick={() => router.push(`/${lang}/register`)}>
              {createAccount}
            </button>
            <a href={`/${lang}/partner`} className="pm-select-account-nav-item">
              {partnerPortal}
            </a>
            <button type="button" className="pm-select-account-nav-item pm-select-account-nav-item--danger" onClick={() => router.push(`/${lang}/login`)}>
              {signOut}
            </button>
          </nav>
        </aside>

        <section className="pm-select-account-main">
          <div className="pm-select-account-copy">
            <span className="pm-select-account-badge">{badge}</span>
            <h1 className="pm-select-account-title">{title}</h1>
            <p className="pm-select-account-subtitle">{subtitle}</p>
          </div>

          <div className="pm-select-account-grid">
            {WORKSPACES.map((ws) => (
              <button
                key={ws.id}
                type="button"
                className="pm-select-account-card"
                onClick={() => handleSelect(ws.id)}
              >
                <div className="pm-select-account-card-head">
                  <div className="pm-select-account-card-avatar">{ws.name.charAt(0)}</div>
                  <div>
                    <strong className="pm-select-account-card-name">{ws.name}</strong>
                    <span className="pm-select-account-card-email">{ws.email}</span>
                  </div>
                </div>
                <div className="pm-select-account-card-body">
                  <span className="pm-select-account-card-plan">{ws.plan}</span>
                  <span className="pm-select-account-card-seats">{ws.seats}</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pm-select-account-card-arrow">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <div className="pm-select-account-footer">
            <p className="pm-select-account-footer-note">{noWorkspaces}</p>
            <button type="button" className="pm-select-account-footer-btn" onClick={() => router.push(`/${lang}/register`)}>
              {createWorkspace}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
