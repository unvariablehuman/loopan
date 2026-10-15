import { useSyncExternalStore } from "react";
import type { Profile } from "@/lib/profile";
import {
  commitProfile,
  getProfileSnapshot,
  getServerProfileSnapshot,
  subscribeProfile,
} from "@/lib/profile-store";

// Works without any provider: state lives in a module-level store (see profile-store.ts).
export function useProfile(): {
  profile: Profile;
  saveProfile: (p: Profile) => { ok: true } | { ok: false; error: string };
} {
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getServerProfileSnapshot);
  return { profile, saveProfile: commitProfile };
}
