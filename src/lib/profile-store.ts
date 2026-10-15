// Module-level profile store (no React, no provider). Consumed through useSyncExternalStore in
// `useProfile`, so the sidebar, mobile drawer and edit dialog all share one value and update
// together. The server snapshot is always the defaults, so SSR and the first client render match;
// React then re-renders with the stored profile after hydration (no hydration mismatch).
import {
  DEFAULT_PROFILE,
  PROFILE_KEY,
  loadProfile,
  sanitizeProfile,
  saveProfile,
  type Profile,
} from "./profile";

let current: Profile | null = null;
const listeners = new Set<() => void>();
let storageHandler: ((e: StorageEvent) => void) | null = null;

function notify() {
  for (const l of listeners) l();
}

export function getProfileSnapshot(): Profile {
  // Lazy single load; the cached reference must stay stable between calls.
  if (current === null) current = loadProfile();
  return current;
}

export function getServerProfileSnapshot(): Profile {
  return DEFAULT_PROFILE;
}

export function subscribeProfile(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined" && storageHandler === null) {
    // Cross-tab sync: another tab saved a profile.
    storageHandler = (e) => {
      if (e.key !== null && e.key !== PROFILE_KEY) return;
      current = loadProfile();
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
export function commitProfile(next: Profile): { ok: true } | { ok: false; error: string } {
  const clean = sanitizeProfile(next);
  const res = saveProfile(clean);
  if (!res.ok) return res;
  current = clean;
  notify();
  return { ok: true };
}

export function __resetProfileStoreForTests() {
  current = null;
  listeners.clear();
  if (storageHandler !== null && typeof window !== "undefined") {
    window.removeEventListener("storage", storageHandler);
  }
  storageHandler = null;
}
