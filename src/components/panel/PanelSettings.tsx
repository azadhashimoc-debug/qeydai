"use client";

import { useRef, useState, type ReactNode } from "react";
import { PanelNotificationSettings } from "./PanelNotificationSettings";
import { loadPanelProfile, maxAvatarBytes, panelProfileKey, type PanelProfile } from "./panel-profile";
import type { PanelLocale } from "./types";

const groups = [
  ["Profil", "Profile", [["profile", "Profil ayarları", "Profile settings"]]],
  ["İş sahəsi", "Workspace", [
    ["workspace", "İş sahəsi ayarları", "Workspace settings"],
    ["chat", "Söhbət ayarları", "Chat settings"],
    ["email", "E-poçt ayarları", "Email settings"],
    ["plans", "Ödənişlər", "Billing"],
    ["members", "İstifadəçi idarəetməsi", "User management"],
  ]],
  ["Təhlükəsizlik", "Security", [
    ["profile-security", "Profil təhlükəsizliyi", "Profile security"],
    ["workspace-security", "İş sahəsinin təhlükəsizliyi", "Workspace security"],
  ]],
  ["AI", "AI", [["ai", "AI ayarları", "AI settings"]]],
] as const;

type Section = (typeof groups)[number][2][number][0];
type LocalSection = Exclude<Section, "plans" | "ai">;
const explanations = {
  chat: ["Söhbət ayarları hələ mövcud deyil. Mövcud kanallara paneldən baxa bilərsiniz.", "Chat settings are not available yet. View existing channels in the panel."],
  email: ["E-poçt hesabı bağlantısı və e-poçt göndərilməsi bu bölmədə hələ mövcud deyil.", "Connecting an email account and sending email from this section are not available yet."],
  "profile-security": ["Şifrə və e-poçt dəyişiklikləri bu paneldən idarə edilmir.", "Password and email changes are not managed from this panel."],
  "workspace-security": ["Əlavə təhlükəsizlik ayarları hələ mövcud deyil. Üzvlərə və onların rollarına istifadəçi idarəetməsində baxın.", "Additional security settings are not available yet. View team members and their roles in User management."],
} as const;

function SettingsIcon({ kind }: { kind: "camera" | "copy" | "info" | "lock" }) {
  const paths = {
    camera: "M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 1 0-8 0 4 4 0 1 0 8 0z",
    copy: "M8 8h12v13H8z M16 4H4v13",
    info: "M22 12a10 10 0 1 0-20 0 10 10 0 1 0 20 0z M12 11v6m0-10h.01",
    lock: "M6 10h12v10H6z M8 10V7a4 4 0 0 1 8 0v3m-4 4v2",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg>;
}

export function PanelSettings({ lang, tenantId, memberId, memberName, onNavigate, children }: {
  lang: PanelLocale;
  tenantId: string;
  memberId: string | null;
  memberName?: string;
  onNavigate: (tab: "ai" | "channels" | "plans") => void;
  children: (section: "workspace" | "members") => ReactNode;
}) {
  const az = lang === "az";
  const key = panelProfileKey(tenantId, memberId);
  const [section, setSection] = useState<LocalSection>("profile");
  const [saved, setSaved] = useState(() => loadPanelProfile(key, memberName));
  const [profile, setProfile] = useState(saved);
  const [status, setStatus] = useState<{ error?: boolean; message: string } | null>(null);
  const avatarRead = useRef(0);
  const changed = JSON.stringify(profile) !== JSON.stringify(saved);
  const profileLabel = az ? "Profil ayarları" : "Profile settings";
  const securityLabel = az ? "Profil təhlükəsizliyi" : "Profile security";
  const title = groups.flatMap((group) => [...group[2]]).find(([id]) => id === section)?.[az ? 1 : 2];

  function update(next: PanelProfile) {
    setProfile(next);
    setStatus(null);
  }

  function readAvatar(file: File | undefined) {
    if (!file) return;
    const attempt = ++avatarRead.current;
    const error = () => setStatus({ error: true, message: az ? "256 KB-dan böyük olmayan PNG, JPEG və ya WebP seçin." : "Choose a PNG, JPEG, or WebP image no larger than 256 KB." });
    if (file.size > maxAvatarBytes || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      error();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (attempt !== avatarRead.current || typeof reader.result !== "string") return;
      const avatar = reader.result;
      setProfile((current) => ({ ...current, avatar }));
      setStatus(null);
    };
    reader.onerror = () => { if (attempt === avatarRead.current) error(); };
    reader.readAsDataURL(file);
  }

  async function copyId() {
    if (!memberId) return;
    try {
      await navigator.clipboard.writeText(memberId);
      setStatus({ message: az ? "İstifadəçi ID-si kopyalandı." : "User ID copied." });
    } catch {
      setStatus({ error: true, message: az ? "ID-ni seçib əl ilə kopyalayın." : "Select the ID and copy it manually." });
    }
  }

  return <div className="panel-settings-layout" data-menu={saved.menu}>
    <nav className="panel-settings-nav" aria-label={az ? "Ayarlar menyusu" : "Settings menu"}>
      <p className="panel-settings-nav-title">{az ? "Ayarlar" : "Settings"}</p>
      {groups.map(([groupAz, groupEn, items]) => <div className="panel-settings-nav-group" key={groupEn}>
        <p>{az ? groupAz : groupEn}</p>
        {items.map(([id, labelAz, labelEn]) => <button type="button" key={id} aria-current={section === id ? "page" : undefined} onClick={() => {
          if (id === "ai" || id === "plans") onNavigate(id);
          else setSection(id);
        }}>{az ? labelAz : labelEn}</button>)}
      </div>)}
    </nav>
    {section === "profile" ? <form className="panel-settings-content" onSubmit={(event) => {
      event.preventDefault();
      if (!changed) return;
      try {
        localStorage.setItem(key, JSON.stringify(profile));
      } catch {
        setStatus({ error: true, message: az ? "Profil saxlanmadı." : "Profile could not be saved." });
        return;
      }
      setSaved(profile);
      setStatus({ message: az ? "Profil bu brauzerdə saxlanıldı." : "Profile saved in this browser." });
    }}>
      <div className="panel-settings-heading">
        <h1>{profileLabel}</h1>
        <button type="submit" className="panel-settings-save" disabled={!changed}>{az ? "Saxla" : "Save"}</button>
      </div>
      <div className="panel-settings-banner">
        <SettingsIcon kind="info" />
        <p>{az ? "Şifrə və hesab təhlükəsizliyi haqqında məlumat: " : "For password and account security information, see "}
          <button type="button" className="panel-settings-link" aria-label={az ? "Profil təhlükəsizliyini aç" : "Open profile security"} onClick={() => setSection("profile-security")}>{securityLabel}</button>.
        </p>
      </div>
      <section className="panel-settings-paper panel-profile-card" aria-label={profileLabel}>
        <div className="panel-profile-photo">
          <div className="panel-profile-avatar" aria-hidden="true">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- The image is a small, browser-local data URL.
              <img src={profile.avatar} alt="" />
            ) : Array.from(profile.name.trim()).slice(0, 2).join("").toLocaleUpperCase(lang) || "Q"}
          </div>
          <label className="panel-profile-camera" title={az ? "Profil şəklini dəyiş" : "Change profile photo"}>
            <SettingsIcon kind="camera" />
            <input type="file" className="sr-only" aria-label={az ? "Profil şəklini dəyiş" : "Change profile photo"} accept="image/png,image/jpeg,image/webp" onChange={(e) => {
              readAvatar(e.target.files?.[0]);
              e.target.value = "";
            }} />
          </label>
          {profile.avatar && <button type="button" className="panel-settings-link panel-profile-remove" onClick={() => { avatarRead.current++; update({ ...profile, avatar: "" }); }}>{az ? "Şəkli sil" : "Remove photo"}</button>}
        </div>
        <div className="panel-profile-fields">
          <div className="panel-profile-row panel-profile-id">
            <span>{az ? "İstifadəçi ID-si" : "User ID"}</span>
            <div><span>{memberId ?? (az ? "Mövcud deyil" : "Not available")}</span>
              {memberId && <button type="button" className="panel-profile-copy" onClick={() => void copyId()} aria-label={az ? "İstifadəçi ID-sini kopyala" : "Copy user ID"}><SettingsIcon kind="copy" /></button>}
            </div>
          </div>
          <label className="panel-profile-row"><span>{az ? "Dil" : "Language"}</span>
            <select value={lang} onChange={(e) => {
              if (changed && !window.confirm(az ? "Dil dəyişdirilsə, saxlanmamış dəyişikliklər itəcək. Davam edilsin?" : "Changing language discards unsaved changes. Continue?")) return;
              window.location.assign(e.target.value === "az" ? "/az/panel?tab=settings" : "/en/panel?tab=settings");
            }}>
              <option value="az">Azərbaycanca</option><option value="en">English</option>
            </select>
          </label>
          <label className="panel-profile-row"><span>{az ? "Ad" : "Name"}</span>
            <input autoComplete="name" value={profile.name} maxLength={120} onChange={(e) => update({ ...profile, name: e.target.value })} />
          </label>
          <label className="panel-profile-row"><span>{az ? "Telefon" : "Phone"}</span>
            <input autoComplete="tel" type="tel" value={profile.phone} maxLength={40} onChange={(e) => update({ ...profile, phone: e.target.value })} />
          </label>
          <div className="panel-profile-row panel-profile-email-row">
            <label htmlFor="panel-profile-email">{az ? "E-poçt" : "Email"}</label>
            <div className="panel-profile-locked">
              <input id="panel-profile-email" type="text" readOnly value="" placeholder={az ? "Mövcud deyil" : "Not available"} />
              <SettingsIcon kind="lock" />
            </div>
            <span className="panel-profile-email-action">
              <button type="button" disabled>{az ? "E-poçtu dəyiş" : "Change email"}</button>
              <small>{az ? "Hələ aktiv deyil" : "Not available yet"}</small>
            </span>
          </div>
          <label className="panel-profile-row"><span>{az ? "Qeyd" : "Note"}</span>
            <textarea rows={3} value={profile.note} maxLength={500} onChange={(e) => update({ ...profile, note: e.target.value })} />
          </label>
          <label className="panel-profile-row"><span>{az ? "Sol menyu" : "Left menu"}</span>
            <select value={profile.menu} onChange={(e) => update({ ...profile, menu: e.target.value === "expanded" ? "expanded" : "compact" })}>
              <option value="compact">{az ? "Yığcam menyu (tövsiyə olunur)" : "Compact menu (recommended)"}</option>
              <option value="expanded">{az ? "Geniş menyu" : "Expanded menu"}</option>
            </select>
          </label>
          {status && <p className="panel-settings-feedback" role={status.error ? "alert" : "status"}>{status.message}</p>}
        </div>
      </section>
      <PanelNotificationSettings lang={lang} profile={profile} onChange={update} />
    </form> : section === "workspace" || section === "members" ? <div className="panel-settings-content">
      <div className="panel-settings-heading"><h1>{title}</h1></div>
      {children(section)}
    </div> : <div className="panel-settings-content">
      <div className="panel-settings-heading"><h1>{title}</h1></div>
      <section className="panel-settings-paper panel-settings-empty">
        <p>{explanations[section][az ? 0 : 1]}</p>
        {section === "chat" && <button type="button" className="panel-settings-link" onClick={() => onNavigate("channels")}>{az ? "Kanallara bax" : "View channels"}</button>}
        {section === "workspace-security" && <button type="button" className="panel-settings-link" onClick={() => setSection("members")}>{az ? "Üzvlərə bax" : "View members"}</button>}
      </section>
    </div>}
  </div>;
}
