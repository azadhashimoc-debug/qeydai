export const frequencies = ["immediate", "daily", "unread-hourly", "unread-quarter-hour"] as const;
export const reminderIntervals = ["5", "15", "30", "60"] as const;

export type Frequency = (typeof frequencies)[number];
export type ReminderInterval = (typeof reminderIntervals)[number];
export type PanelMenu = "compact" | "expanded";

export type PanelProfile = {
  name: string;
  phone: string;
  note: string;
  avatar: string;
  menu: PanelMenu;
  notifications: boolean;
  choices: Record<string, boolean>;
  emailFrequency: Partial<Record<string, Frequency>>;
  reminder: ReminderInterval;
};

export const maxAvatarBytes = 256 * 1024;
const avatarPattern = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number, fallback = "") {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

export function panelProfileKey(tenantId: string, memberId: string | null) {
  return `panelim:profile:${tenantId}:${memberId ?? "default"}`;
}

export function loadPanelProfile(key: string, memberName = ""): PanelProfile {
  let data: Record<string, unknown> = {};
  try {
    data = record(JSON.parse(localStorage.getItem(key) ?? "{}"));
  } catch {
    // Blocked storage or an invalid record should not stop the settings screen.
  }
  const choices = Object.fromEntries(
    Object.entries(record(data.choices)).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
  for (const channel of ["email", "browser"]) {
    for (const [old, next] of [["tasks", "task-reminder"], ["bookings", "task-assigned"]]) {
      const oldKey = `${old}:${channel}`;
      const newKey = `${next}:${channel}`;
      if (Object.hasOwn(choices, oldKey) && !Object.hasOwn(choices, newKey)) choices[newKey] = choices[oldKey];
    }
  }
  const emailFrequency = Object.fromEntries(
    Object.entries(record(data.emailFrequency)).filter((entry): entry is [string, Frequency] =>
      frequencies.some((option) => option === entry[1]),
    ),
  );
  const avatar = text(data.avatar, Math.ceil(maxAvatarBytes / 3) * 4 + 32);

  return {
    name: text(data.name, 120, text(memberName, 120)),
    phone: text(data.phone, 40),
    note: text(data.note, 500),
    avatar: avatarPattern.test(avatar) ? avatar : "",
    menu: data.menu === "expanded" ? "expanded" : "compact",
    notifications: data.notifications === true,
    choices,
    emailFrequency,
    reminder: reminderIntervals.find((option) => option === data.reminder) ?? "5",
  };
}
