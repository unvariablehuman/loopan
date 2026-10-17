// Pure onboarding-flow state + persistence (no React), mirroring recipe-prefs.ts / profile.ts.
// This records ONLY whether the user has passed the opening flow (splash -> welcome -> login /
// signup / demo) and HOW they entered. It is NOT authentication: there is no account, no password
// is ever stored, nothing is sent to a server. The flag lives under its OWN localStorage key and
// never touches the pantry (`loopan.pantry.v1`), profile or sidebar keys.

export const ONBOARDING_KEY = "loopan.onboarding.v1";
export const ONBOARDING_STORAGE_ERROR =
  "Penyimpanan penuh atau tidak tersedia. Perubahan belum tersimpan.";

// `mode` only distinguishes how the user entered (simulated login/signup vs demo). It is never an
// auth claim. `entered` is the single "flag set" the flow checks before showing the dashboard.
export type OnboardingMode = "login" | "signup" | "demo";

export type Onboarding = { entered: boolean; mode: OnboardingMode | null };

export const DEFAULT_ONBOARDING: Onboarding = Object.freeze({ entered: false, mode: null });

const MODES: readonly OnboardingMode[] = ["login", "signup", "demo"];

function isMode(v: unknown): v is OnboardingMode {
  return typeof v === "string" && (MODES as readonly string[]).includes(v);
}

// Field-by-field recovery: a non-object/array becomes the default; `entered` is coerced to a
// boolean; `mode` must be one of the three literals else null; a false `entered` forces `mode:null`
// so the two fields can never disagree.
export function sanitizeOnboarding(raw: unknown): Onboarding {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { entered: false, mode: null };
  }
  const r = raw as Record<string, unknown>;
  const entered = r["entered"] === true;
  const mode = entered && isMode(r["mode"]) ? r["mode"] : null;
  return { entered, mode };
}

function defaultReadStorage(): Pick<Storage, "getItem"> | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function defaultWriteStorage(): Pick<Storage, "setItem"> | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadOnboarding(storage: Pick<Storage, "getItem"> | null = defaultReadStorage()): Onboarding {
  if (!storage) return sanitizeOnboarding(null);
  try {
    const raw = storage.getItem(ONBOARDING_KEY);
    if (raw === null) return sanitizeOnboarding(null);
    return sanitizeOnboarding(JSON.parse(raw));
  } catch {
    return sanitizeOnboarding(null);
  }
}

export function saveOnboarding(
  state: Onboarding,
  storage: Pick<Storage, "setItem"> | null = defaultWriteStorage(),
): { ok: true } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: ONBOARDING_STORAGE_ERROR };
  try {
    storage.setItem(ONBOARDING_KEY, JSON.stringify(sanitizeOnboarding(state)));
    return { ok: true };
  } catch {
    return { ok: false, error: ONBOARDING_STORAGE_ERROR };
  }
}
