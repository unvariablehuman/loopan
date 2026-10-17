// Module-level onboarding store (no React, no provider), same shape as recipe-prefs-store.ts /
// profile-store.ts. Consumed through useSyncExternalStore in `useOnboarding`. The server snapshot
// is always the defaults (entered: false), so SSR and the first client render match; React then
// re-renders with the stored flag after hydration (no hydration mismatch).
import {
  DEFAULT_ONBOARDING,
  ONBOARDING_KEY,
  loadOnboarding,
  sanitizeOnboarding,
  saveOnboarding,
  type Onboarding,
} from "./onboarding";

let current: Onboarding | null = null;
const listeners = new Set<() => void>();
let storageHandler: ((e: StorageEvent) => void) | null = null;

function notify() {
  for (const l of listeners) l();
}

export function getOnboardingSnapshot(): Onboarding {
  // Lazy single load; the cached reference must stay stable between calls.
  if (current === null) current = loadOnboarding();
  return current;
}

export function getServerOnboardingSnapshot(): Onboarding {
  return DEFAULT_ONBOARDING;
}

export function subscribeOnboarding(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined" && storageHandler === null) {
    // Cross-tab sync: another tab entered or exited the flow.
    storageHandler = (e) => {
      if (e.key !== null && e.key !== ONBOARDING_KEY) return;
      current = loadOnboarding();
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
export function commitOnboarding(next: Onboarding): { ok: true } | { ok: false; error: string } {
  const clean = sanitizeOnboarding(next);
  const res = saveOnboarding(clean);
  if (!res.ok) return res;
  current = clean;
  notify();
  return { ok: true };
}

export function __resetOnboardingStoreForTests() {
  current = null;
  listeners.clear();
  if (storageHandler !== null && typeof window !== "undefined") {
    window.removeEventListener("storage", storageHandler);
  }
  storageHandler = null;
}
