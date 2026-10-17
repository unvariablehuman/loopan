import { useSyncExternalStore } from "react";
import { DEFAULT_ONBOARDING, type OnboardingMode } from "@/lib/onboarding";
import {
  commitOnboarding,
  getOnboardingSnapshot,
  getServerOnboardingSnapshot,
  subscribeOnboarding,
} from "@/lib/onboarding-store";

type Result = { ok: true } | { ok: false; error: string };

// Works without any provider: state lives in a module-level store (see onboarding-store.ts).
// `enter` marks the flow as passed (NOT a real login); `reset` clears the flag so the user is
// taken back through welcome. Neither ever touches the pantry/profile keys.
export function useOnboarding(): {
  entered: boolean;
  mode: OnboardingMode | null;
  enter: (mode: OnboardingMode) => Result;
  reset: () => Result;
} {
  const state = useSyncExternalStore(subscribeOnboarding, getOnboardingSnapshot, getServerOnboardingSnapshot);
  return {
    entered: state.entered,
    mode: state.mode,
    enter: (mode) => commitOnboarding({ entered: true, mode }),
    reset: () => commitOnboarding({ ...DEFAULT_ONBOARDING }),
  };
}
