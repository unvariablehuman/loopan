// Module-level recipe-preferences store (no React, no provider), same shape as profile-store.ts.
// /settings and /cook both read it through useSyncExternalStore in `useRecipePrefs`. The server
// snapshot is always the defaults, so SSR and the first client render match; React re-renders with
// the stored value after hydration.
import {
  DEFAULT_RECIPE_PREFS,
  RECIPE_PREFS_KEY,
  loadRecipePrefs,
  sanitizeRecipePrefs,
  saveRecipePrefs,
  type RecipePrefs,
} from "./recipe-prefs";

let current: RecipePrefs | null = null;
const listeners = new Set<() => void>();
let storageHandler: ((e: StorageEvent) => void) | null = null;

function notify() {
  for (const l of listeners) l();
}

export function getRecipePrefsSnapshot(): RecipePrefs {
  // Lazy single load; the cached reference must stay stable between calls.
  if (current === null) current = loadRecipePrefs();
  return current;
}

export function getServerRecipePrefsSnapshot(): RecipePrefs {
  return DEFAULT_RECIPE_PREFS;
}

export function subscribeRecipePrefs(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined" && storageHandler === null) {
    // Cross-tab sync: another tab changed the preferences.
    storageHandler = (e) => {
      if (e.key !== null && e.key !== RECIPE_PREFS_KEY) return;
      current = loadRecipePrefs();
      notify();
    };
    window.addEventListener("storage", storageHandler);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && storageHandler !== null && typeof window !== "undefined") {
      window.removeEventListener("storage", storageHandler);
      storageHandler = null;
    }
  };
}

// Only a successful write updates the store; a failed save leaves every consumer unchanged.
export function commitRecipePrefs(next: RecipePrefs): { ok: true } | { ok: false; error: string } {
  const clean = sanitizeRecipePrefs(next);
  const res = saveRecipePrefs(clean);
  if (!res.ok) return res;
  current = clean;
  notify();
  return { ok: true };
}

export function __resetRecipePrefsStoreForTests() {
  current = null;
  listeners.clear();
  if (storageHandler !== null && typeof window !== "undefined") {
    window.removeEventListener("storage", storageHandler);
  }
  storageHandler = null;
}
