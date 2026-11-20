import { mkdirSync } from "node:fs";
import path from "node:path";
import { SqliteEnrollmentStore } from "../enrollment/sqlite-store";
import { createEnrollApi } from "./enroll-api";
import { createPanelApi } from "./panel-api";
import { getPanelAuthConfig, setPanelJtiStore } from "./panel-auth";

const MIN_KEY_LENGTH = 24;

/**
 * QEYDAI_API_KEYS is a JSON object {"<api key>": "<tenant id>"}. Keys shorter than 24 characters and
 * empty tenant ids are dropped. Anything invalid yields no keys, so every request is rejected (fail closed).
 * Key values are never logged.
 */
export function parseKeys(raw: string | undefined, name = "QEYDAI_API_KEYS"): Record<string, string> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`${name} is not valid JSON; API disabled`);
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    console.error(`${name} must be a JSON object; API disabled`);
    return {};
  }
  const out: Record<string, string> = {};
  let dropped = 0;
  for (const [k, v] of Object.entries(parsed)) {
    if (k.length >= MIN_KEY_LENGTH && typeof v === "string" && v.trim()) out[k] = v.trim();
    else dropped++;
  }
  if (dropped) console.error(`${name}: ${dropped} entr${dropped === 1 ? "y" : "ies"} ignored (key too short or tenant missing)`);
  return out;
}

type Api = ReturnType<typeof createEnrollApi>;
type PanelApi = ReturnType<typeof createPanelApi>;

let sharedStore: SqliteEnrollmentStore | null = null;
let api: Api | null = null;
let panelApi: PanelApi | null = null;

export function getSharedStore(): SqliteEnrollmentStore {
  if (!sharedStore) {
    const file = process.env.ENROLL_DB_FILE ?? path.join(process.cwd(), "data", "qeydai.sqlite");
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    sharedStore = new SqliteEnrollmentStore(file);
  }
  return sharedStore;
}

const buildUnavailable = async () =>
  Response.json({ ok: false, error: "unavailable_during_build" }, { status: 503 });

// Next runs route handlers once while building (prerender probe). Never open the database then:
// it would create files in the build directory (and bake an empty DB into build images).
const buildPhaseApi: Api = {
  listSessions: buildUnavailable,
  enroll: buildUnavailable,
  createSession: buildUnavailable,
  upsertLead: buildUnavailable,
  addMessage: buildUnavailable,
};

const buildPhasePanelApi: PanelApi = {
  authGet: buildUnavailable,
  authPost: buildUnavailable,
  authDelete: buildUnavailable,
  overview: buildUnavailable,
  listSessions: buildUnavailable,
  createSession: buildUnavailable,
  listLeads: buildUnavailable,
  createLead: buildUnavailable,
  updateLead: buildUnavailable,
  listMessages: buildUnavailable,
  createMessage: buildUnavailable,
};

/** Lazily creates the API on first request so builds and tests never open the database. */
export function getEnrollApi(): Api {
  if (process.env.NEXT_PHASE === "phase-production-build") return buildPhaseApi;
  if (!api) {
    api = createEnrollApi({
      store: getSharedStore(),
      keys: parseKeys(process.env.QEYDAI_API_KEYS),
      adminKeys: parseKeys(process.env.QEYDAI_ADMIN_KEYS, "QEYDAI_ADMIN_KEYS"),
    });
  }
  return api;
}

/** Lazily creates the Panel API sharing the single SQLite store instance. */
export function getPanelApi(): PanelApi {
  if (process.env.NEXT_PHASE === "phase-production-build") return buildPhasePanelApi;
  if (!panelApi) {
    const store = getSharedStore();
    setPanelJtiStore(store);
    panelApi = createPanelApi({
      store,
      getAuthConfig: () => getPanelAuthConfig(),
    });
  }
  return panelApi;
}
