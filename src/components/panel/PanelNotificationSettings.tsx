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
  ["support", "QeydAI dəstəyi ilə söhbət", "Chat from QeydAI team"],
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

export function PanelNotificationSettings({ lang, profile, onChange }: {
  lang: PanelLocale;
  profile: PanelProfile;
  onChange: (profile: PanelProfile) => void;
}) {
  const az = lang === "az";
  const heading = useId();
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
                  <span>{az ? "Telegram bildirişləri hələ aktiv deyil." : "Telegram notifications are not active yet."}</span>
                </details>
              </th>
            </tr>
          </thead>
          <tbody>
            {primary && <tr><td colSpan={5} className="panel-notification-notices">
              <span>{az ? "Brauzerdə bildiriş göndərilməsi aktiv deyil." : "Browser notification delivery is not active."}</span>
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
    <p className="panel-settings-hint">{az ? "Seçimlər yalnız bu brauzerdə saxlanılır. Bildiriş göndərilməsi hələ aktiv deyil." : "Preferences are saved only in this browser. Notification delivery is not active yet."}</p>
    {renderTable(az ? "Ətraflı ayarlar" : "Advanced settings", advanced, true)}
    {renderTable(az ? "İnteqrasiyalar" : "Integrations", integrations)}
  </section>;
}
