import { useId, type ComponentProps } from "react";
import { frequencies, reminderIntervals, type Frequency, type PanelProfile, type ReminderInterval } from "./panel-profile";
import type { PanelLocale } from "./types";

const advanced = [
  ["activity", "Fəaliyyət limitləri", "Activity limits"],
  ["billing", "Ödənişlər", "Billing"],
  ["calls", "Zənglər", "Calls"],
  ["errors", "Xətalar və digər məlumatlar", "Errors & other info"],
  ["inbox", "Gələnlər", "Inbox"],
  ["mentions", "Qeydlər və komanda söhbəti", "Mentions and team chat"],
  ["support", "Panelim dəstəyi ilə söhbət", "Chat from Panelim team"],
  ["incoming-email", "Gələn e-poçtlar", "Incoming emails"],
  ["leads", "Yeni müraciətlər", "Incoming leads"],
  ["task-reminder", "Tapşırıqlar və rezervasiyalar: tədbirdən əvvəl", "Tasks & Bookings: before the event"],
  ["task-completed", "Tapşırıqlar və rezervasiyalar: tədbir tamamlandı", "Tasks & Bookings: The event is completed"],
  ["task-expired", "Tapşırıqlar və rezervasiyalar: tədbirin vaxtı bitdi", "Tasks & Bookings: The event is expired"],
  ["task-assigned", "Tapşırıqlar və rezervasiyalar: sizə yeni tədbir təyin olundu", "Tasks & Bookings: You have been assigned a new event"],
] as const;
const integrations = [["whatsapp", "WhatsApp Business", "WhatsApp Business"]] as const;
const channels = [["email", "E-poçt", "Email"], ["mobile", "Mobil", "Mobile"], ["browser", "Brauzer", "Browser"]] as const;
const frequencyLabels = {
  immediate: ["Dərhal", "Immediately"],
  daily: ["Gündə bir dəfə, 18:00", "Once per day, 18:00"],
  "unread-hourly": ["Yalnız oxunmamışlar · hər saat", "Unread only · every hour"],
  "unread-quarter-hour": ["Yalnız oxunmamışlar · hər 15 dəqiqə", "Unread only · every 15 minutes"],
} as const;

type NotificationRows = readonly (readonly [string, string, string])[];

function Choice({ keys, choices, onSet, ...props }: Omit<ComponentProps<"input">, "ref" | "checked" | "type" | "onChange"> & {
  keys: readonly string[];
  choices: PanelProfile["choices"];
  onSet: (keys: readonly string[], checked: boolean) => void;
}) {
  const count = keys.filter((key) => choices[key]).length;
  const all = count === keys.length;
  return <input {...props} type="checkbox" checked={all} ref={(node) => {
    if (node) node.indeterminate = count > 0 && !all;
  }} onChange={() => onSet(keys, !all)} />;
}

export function PanelNotificationSettings({
  lang,
  profile,
  onChange,
  telegramBotConfigured = false,
  onTestTelegram,
  testState,
}: {
  lang: PanelLocale;
  profile: PanelProfile;
  onChange: (profile: PanelProfile) => void;
  telegramBotConfigured?: boolean;
  onTestTelegram?: () => void;
  testState?: { sending: boolean; error?: boolean; message?: string };
}) {
  const az = lang === "az";
  const heading = useId();
  const chatIdInput = useId();
  const onSet = (keys: readonly string[], checked: boolean) => {
    const choices = { ...profile.choices };
    keys.forEach((key) => { choices[key] = checked; });
    onChange({ ...profile, choices });
  };
  const bulkLabel = (label: string) => `${az ? "Hamısını seç" : "Select all"}: ${label}`;

  function renderTable(title: string, rows: NotificationRows, primary = false) {
    const allKeys = rows.flatMap(([event]) => channels.map(([channel]) => `${event}:${channel}`));
    return (
      <div className="panel-notification-scroll panel-settings-paper" role="region" aria-label={title} tabIndex={0}>
        <table className="panel-notification-table" aria-label={title}>
          <thead>
            <tr>
              <th scope="col"><label><Choice keys={allKeys} choices={profile.choices} onSet={onSet} disabled={!profile.notifications} aria-label={bulkLabel(title)} />{title}</label></th>
              {channels.map(([channel, a, e]) => {
                const label = az ? a : e;
                return <th scope="col" key={channel}><label><Choice keys={rows.map(([event]) => `${event}:${channel}`)} choices={profile.choices} onSet={onSet} disabled={!profile.notifications} aria-label={bulkLabel(label)} />{label}</label></th>;
              })}
              <th scope="col" className="panel-notification-more">
                <details>
                  <summary aria-label={az ? "Digər bildiriş kanalları" : "More notification channels"} title="Telegram">+</summary>
                  <span>
                    {az
                      ? "Telegram bildirişləri yuxarıdakı Chat ID bölməsindən idarə olunur."
                      : "Telegram alerts are configured in the Chat ID section above."}
                  </span>
                </details>
              </th>
            </tr>
          </thead>
          <tbody>
            {primary && <tr><td colSpan={5} className="panel-notification-notices">
              <span>
                {az
                  ? "Bildiriş seçimləri iş sahənizdə saxlanılır. Yeni müraciətlər Telegram üzərindən çatdırılır."
                  : "Notification preferences sync to your workspace. Incoming lead alerts are delivered via Telegram."}
              </span>
            </td></tr>}
            {rows.map(([event, a, e]) => {
              const label = az ? a : e;
              return <tr key={event}>
                <th scope="row"><div className="panel-notification-cell">
                  <Choice keys={channels.map(([channel]) => `${event}:${channel}`)} choices={profile.choices} onSet={onSet} disabled={!profile.notifications} aria-label={bulkLabel(label)} />
                  <span>{label}</span>
                  {event === "task-reminder" && <select aria-label={az ? "Xatırlatma müddəti" : "Reminder interval"} value={profile.reminder} disabled={!profile.notifications} onChange={(e) => onChange({ ...profile, reminder: e.target.value as ReminderInterval })}>
                    {reminderIntervals.map((minutes) => <option key={minutes} value={minutes}>{minutes} {az ? "dəqiqə" : "minutes"}</option>)}
                  </select>}
                </div></th>
                {channels.map(([channel, a, e]) => {
                  const channelLabel = az ? a : e;
                  return <td key={channel}><div className="panel-notification-cell">
                    <Choice keys={[`${event}:${channel}`]} choices={profile.choices} onSet={onSet} disabled={!profile.notifications} aria-label={`${label}: ${channelLabel}`} />
                    {channel === "email" && <select aria-label={`${label}: ${az ? "E-poçt tezliyi" : "Email frequency"}`} value={profile.emailFrequency[event] ?? "immediate"} disabled={!profile.notifications} onChange={(e) => onChange({ ...profile, emailFrequency: { ...profile.emailFrequency, [event]: e.target.value as Frequency } })}>
                      {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequencyLabels[frequency][az ? 0 : 1]}</option>)}
                    </select>}
                  </div></td>;
                })}
                <td />
              </tr>;
            })}
            {primary && <tr className="panel-notification-unavailable">
              <th scope="row"><label><input type="checkbox" disabled />{az ? "Planlı hesabat" : "Scheduled report"}</label></th><td colSpan={4} />
            </tr>}
          </tbody>
        </table>
      </div>
    );
  }

  return <section className="panel-notifications" aria-labelledby={heading}>
    <div className="panel-settings-heading">
      <h2 id={heading}>{az ? "Bildiriş ayarları" : "Notification settings"}</h2>
      <label className="panel-settings-switch">
        {az ? "Bildirişləri al" : "Receive notifications"}
        <input type="checkbox" role="switch" checked={profile.notifications} onChange={(e) => onChange({ ...profile, notifications: e.target.checked })} />
      </label>
    </div>
    <p className="panel-settings-hint">
      {az
        ? "Seçimlər iş sahənizdə saxlanılır. Yeni müraciətlər və sistem bildirişləri üçün Telegram Chat ID əlavə edə bilərsiniz."
        : "Preferences are saved to your workspace. Add your Telegram Chat ID below to receive live lead and system alerts."}
    </p>
    <div className="panel-settings-paper" style={{ padding: "14px 16px", marginBottom: "14px", display: "grid", gap: "10px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={profile.telegramEnabled}
            disabled={!profile.notifications}
            onChange={(e) => onChange({ ...profile, telegramEnabled: e.target.checked })}
          />
          {az ? "Telegram bildirişlərini aktiv et" : "Enable Telegram alerts"}
        </label>
        <span style={{ fontSize: "0.78rem", opacity: 0.78 }}>
          {telegramBotConfigured
            ? az
              ? "Telegram botu hazırdır"
              : "Telegram alert bot ready"
            : az
              ? "Bot tokeni əlavə olunan kimi aktivləşəcək"
              : "Activates once alert bot token is set"}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
        <label htmlFor={chatIdInput} style={{ fontSize: "0.84rem", fontWeight: 500 }}>
          {az ? "Telegram Chat ID" : "Telegram Chat ID"}
        </label>
        <input
          id={chatIdInput}
          type="text"
          inputMode="numeric"
          placeholder={az ? "məs. 123456789" : "e.g. 123456789"}
          value={profile.telegramChatId}
          maxLength={64}
          disabled={!profile.notifications}
          onChange={(e) => onChange({ ...profile, telegramChatId: e.target.value })}
          style={{ flex: "1 1 180px", minHeight: "38px", padding: "6px 10px" }}
        />
        {onTestTelegram && (
          <button
            type="button"
            disabled={!profile.notifications || !profile.telegramChatId.trim() || testState?.sending}
            onClick={onTestTelegram}
            className="panel-settings-save"
            style={{ minHeight: "38px" }}
          >
            {testState?.sending
              ? az
                ? "Göndərilir..."
                : "Sending..."
              : az
                ? "Test göndər"
                : "Send test"}
          </button>
        )}
      </div>
      {testState?.message && (
        <p role={testState.error ? "alert" : "status"} style={{ margin: 0, fontSize: "0.82rem" }}>
          {testState.message}
        </p>
      )}
    </div>
    {renderTable(az ? "Ətraflı ayarlar" : "Advanced settings", advanced, true)}
    {renderTable(az ? "İnteqrasiyalar" : "Integrations", integrations)}
  </section>;
}
