import { useSyncExternalStore } from "react";
import type { RecipePrefId } from "@/lib/recipe-prefs";
import {
  commitRecipePrefs,
  getRecipePrefsSnapshot,
  getServerRecipePrefsSnapshot,
  subscribeRecipePrefs,
} from "@/lib/recipe-prefs-store";

type Result = { ok: true } | { ok: false; error: string };

// Works without any provider: state lives in a module-level store (see recipe-prefs-store.ts).
export function useRecipePrefs(): {
  selected: RecipePrefId[];
  toggle: (id: RecipePrefId) => Result;
  clear: () => Result;
} {
  const prefs = useSyncExternalStore(subscribeRecipePrefs, getRecipePrefsSnapshot, getServerRecipePrefsSnapshot);
  return {
    selected: prefs.selected,
    // Read the snapshot at call time (not from the render closure) so rapid clicks compose.
    toggle: (id) => {
      const cur = getRecipePrefsSnapshot().selected;
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return commitRecipePrefs({ selected: next });
    },
    clear: () => commitRecipePrefs({ selected: [] }),
  };
}
