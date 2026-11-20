export const EXPERIMENTS = {
  hero_cta_v1: ["control", "benefit"] as const,
} as const;

export type ExperimentId = keyof typeof EXPERIMENTS;
export type ExperimentVariant<T extends ExperimentId = ExperimentId> = (typeof EXPERIMENTS)[T][number];

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type AssignOpts = {
  search?: string;
  storage?: StorageLike | null;
  random?: () => number;
};

const STORAGE_PREFIX = "qeydai_ab_";

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function defaultRandom(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 4_294_967_296;
  }
  return Math.random();
}

export function assignExperimentVariant<T extends ExperimentId>(
  experimentId: T,
  opts: AssignOpts = {},
): ExperimentVariant<T> {
  const variants = EXPERIMENTS[experimentId] as readonly ExperimentVariant<T>[];
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage;
  const search = opts.search ?? (typeof window !== "undefined" ? window.location.search : "");
  const storageKey = `${STORAGE_PREFIX}${experimentId}`;

  if (search) {
    try {
      const override = new URLSearchParams(search).get(`ab_${experimentId}`)?.trim();
      if (override && (variants as readonly string[]).includes(override)) {
        try {
          storage?.setItem(storageKey, override);
        } catch {
          /* ignore blocked storage */
        }
        return override as ExperimentVariant<T>;
      }
    } catch {
      /* ignore malformed query */
    }
  }

  try {
    const saved = storage?.getItem(storageKey);
    if (saved && (variants as readonly string[]).includes(saved)) {
      return saved as ExperimentVariant<T>;
    }
  } catch {
    /* ignore blocked storage */
  }

  const r = (opts.random ?? defaultRandom)();
  const idx = Math.min(variants.length - 1, Math.max(0, Math.floor(r * variants.length)));
  const chosen = variants[idx];
  try {
    storage?.setItem(storageKey, chosen);
  } catch {
    /* ignore blocked storage */
  }
  return chosen;
}

export function formatExperimentToken<T extends ExperimentId>(
  experimentId: T,
  variant: ExperimentVariant<T>,
): string {
  return `${experimentId}:${variant}`;
}

export function getActiveExperimentToken(opts: AssignOpts = {}): string {
  const variant = assignExperimentVariant("hero_cta_v1", opts);
  return formatExperimentToken("hero_cta_v1", variant);
}
