import { expect, it } from "vitest";
import { filterThreads, type InboxFilters } from "./InboxTab";
import type { LeadRecord } from "./types";

const now = new Date(2026, 10, 26, 12, 0); // Thu 26 Nov 2026, local time
const lead = (id: string, updatedAt: Date, extra: Partial<LeadRecord> = {}): LeadRecord => ({
  id, tenantId: "t", name: `Lead ${id}`, phone: `+99450000000${id}`, source: "telegram", stage: "new",
  note: "", createdAt: updatedAt.toISOString(), updatedAt: updatedAt.toISOString(), ...extra,
});
const leads = [
  lead("1", new Date(2026, 10, 26, 9)),
  lead("2", new Date(2026, 10, 25, 18), { source: "whatsapp", stage: "paid" }),
  lead("3", new Date(2026, 10, 22, 10)), // Sunday, before this week
  lead("4", new Date(2026, 9, 10, 10), { name: "Aysel" }),
];
const base: InboxFilters = { query: "", period: "any", stage: "all", source: "all", sort: "newest" };
const ids = (f: Partial<InboxFilters>) => filterThreads(leads, { ...base, ...f }, now).map((l) => l.id);

it("filters threads like Kommo chats: period, stage, channel, search and sort", () => {
  expect(ids({})).toEqual(["1", "2", "3", "4"]);
  expect(ids({ sort: "longestWait" })).toEqual(["4", "3", "2", "1"]);
  expect(ids({ period: "today" })).toEqual(["1"]);
  expect(ids({ period: "yesterday" })).toEqual(["2"]);
  expect(ids({ period: "week" })).toEqual(["1", "2"]); // week starts Mon 23 Nov 00:00
  expect(ids({ period: "month" })).toEqual(["1", "2", "3"]);
  expect(ids({ period: "d30" })).toEqual(["1", "2", "3"]);
  expect(ids({ stage: "paid" })).toEqual(["2"]);
  expect(ids({ source: "whatsapp" })).toEqual(["2"]);
  expect(ids({ query: "ays" })).toEqual(["4"]);
});
