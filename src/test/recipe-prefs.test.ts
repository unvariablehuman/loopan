import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RECIPE_PREFS,
  PRACTICAL_MAX_MINUTES,
  RECIPE_PREFS,
  RECIPE_PREFS_KEY,
  RECIPE_PREFS_STORAGE_ERROR,
  filterMatchesByPrefs,
  loadRecipePrefs,
  recipeMatchesPrefs,
  sanitizeRecipePrefs,
  saveRecipePrefs,
} from "@/lib/recipe-prefs";
import {
  __resetRecipePrefsStoreForTests,
  commitRecipePrefs,
  getRecipePrefsSnapshot,
  getServerRecipePrefsSnapshot,
  subscribeRecipePrefs,
} from "@/lib/recipe-prefs-store";
import { RECIPES, type Recipe } from "@/lib/recipes";
import { rankRecipes } from "@/lib/recipe-match";
import type { PantryItem } from "@/lib/pantry-data";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? (data[k] as string) : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

function makeItem(name: string): PantryItem {
  return {
    id: name,
    name,
    category: "Other",
    quantity: "1",
    location: "Fridge",
    expiresOn: "2099-12-31",
    dateType: "use_by",
    addedAt: "2025-01-01T00:00:00.000Z",
  };
}

const ids = (rs: { recipe: Recipe }[]) => rs.map((m) => m.recipe.id);
const idsOf = (selected: string[]) => RECIPES.filter((r) => recipeMatchesPrefs(r, selected)).map((r) => r.id);

beforeEach(() => {
  window.localStorage.clear();
  __resetRecipePrefsStoreForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  __resetRecipePrefsStoreForTests();
});

describe("recipe prefs defaults and sanitize", () => {
  it("uses the new key and defaults to nothing selected", () => {
    expect(RECIPE_PREFS_KEY).toBe("loopan.recipe-prefs.v1");
    expect(DEFAULT_RECIPE_PREFS).toEqual({ selected: [] });
  });

  it("offers exactly the audited preferences, each with a label and a rule text", () => {
    expect(RECIPE_PREFS.map((p) => p.id)).toEqual(["praktis", "tanpa-telur", "tanpa-susu"]);
    for (const p of RECIPE_PREFS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.rule.length).toBeGreaterThan(0);
    }
    expect(RECIPE_PREFS[0].rule).toContain(String(PRACTICAL_MAX_MINUTES));
  });

  it("drops unknown ids, non-strings and duplicates, keeping canonical order", () => {
    expect(sanitizeRecipePrefs({ selected: ["tanpa-susu", "vegetarian", 3, null, "praktis", "praktis"] })).toEqual({
      selected: ["praktis", "tanpa-susu"],
    });
  });

  it.each([null, undefined, [], 42, "x", {}, { selected: "praktis" }, { selected: null }])(
    "returns defaults for wrong-shaped input %j",
    (raw) => {
      expect(sanitizeRecipePrefs(raw)).toEqual({ selected: [] });
    },
  );

  it("load survives missing, corrupt, wrong-shaped JSON, null storage and a throwing getItem", () => {
    expect(loadRecipePrefs(fakeStorage())).toEqual({ selected: [] });
    expect(loadRecipePrefs(fakeStorage({ [RECIPE_PREFS_KEY]: "{not json" }))).toEqual({ selected: [] });
    expect(loadRecipePrefs(fakeStorage({ [RECIPE_PREFS_KEY]: "[1,2]" }))).toEqual({ selected: [] });
    expect(loadRecipePrefs(null)).toEqual({ selected: [] });
    expect(
      loadRecipePrefs({
        getItem: () => {
          throw new Error("denied");
        },
      }),
    ).toEqual({ selected: [] });
  });
});

describe("recipe prefs save/load", () => {
  it("round-trips under the new key and writes ONLY that key", () => {
    const s = fakeStorage();
    expect(saveRecipePrefs({ selected: ["praktis", "tanpa-telur"] }, s)).toEqual({ ok: true });
    expect(Object.keys(s.data)).toEqual([RECIPE_PREFS_KEY]);
    expect(loadRecipePrefs(s)).toEqual({ selected: ["praktis", "tanpa-telur"] });
  });

  it("returns an Indonesian error instead of throwing when storage fails or is missing", () => {
    const failing = {
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(saveRecipePrefs({ selected: ["praktis"] }, failing)).toEqual({ ok: false, error: RECIPE_PREFS_STORAGE_ERROR });
    expect(saveRecipePrefs({ selected: ["praktis"] }, null)).toEqual({ ok: false, error: RECIPE_PREFS_STORAGE_ERROR });
  });
});

describe("recipe pref rules against the real catalog", () => {
  it.each(RECIPE_PREFS.map((p) => [p.id, p] as const))("%s matches some but not all recipes", (_id, p) => {
    const n = RECIPES.filter((r) => p.test(r)).length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(RECIPES.length);
  });

  it("documented rules hold for every recipe", () => {
    const tokens = (r: Recipe) => r.ingredients.flatMap((i) => i.toLowerCase().split(/\s+/));
    for (const r of RECIPES) {
      expect(RECIPE_PREFS[0].test(r)).toBe(r.minutes <= 15);
      expect(RECIPE_PREFS[1].test(r)).toBe(!tokens(r).includes("telur"));
      expect(RECIPE_PREFS[2].test(r)).toBe(!tokens(r).some((t) => ["susu", "yoghurt", "yogurt"].includes(t)));
    }
  });

  it("pins today's matches", () => {
    expect(idsOf(["praktis"]).sort()).toEqual(
      ["orak-arik-telur-wortel", "roti-panggang-telur-susu", "smoothie-yoghurt-pisang", "telur-dadar-bayam"].sort(),
    );
    expect(idsOf(["tanpa-telur"]).sort()).toEqual(
      ["bubur-bayam", "smoothie-yoghurt-pisang", "sup-sayur-sederhana", "tumis-wortel"].sort(),
    );
    expect(idsOf(["tanpa-susu"])).not.toContain("roti-panggang-telur-susu");
    expect(idsOf(["tanpa-susu"])).not.toContain("smoothie-yoghurt-pisang");
    expect(idsOf(["tanpa-susu"])).toHaveLength(RECIPES.length - 2);
  });

  it("matches ingredient tokens, e.g. 'susu kental manis'", () => {
    const r: Recipe = { id: "x", title: "X", minutes: 5, ingredients: ["susu kental manis"], steps: [] };
    expect(RECIPE_PREFS[2].test(r)).toBe(false);
  });
});

describe("filterMatchesByPrefs", () => {
  const items = [makeItem("Telur"), makeItem("Bayam"), makeItem("Wortel")];
  const ranked = rankRecipes(RECIPES, items);

  it("returns everything unchanged and in the same order with no selection", () => {
    const out = filterMatchesByPrefs(ranked, []);
    expect(ids(out)).toEqual(ids(ranked));
    expect(out).toHaveLength(RECIPES.length);
  });

  it("uses AND semantics", () => {
    expect(ids(filterMatchesByPrefs(ranked, ["praktis", "tanpa-telur"]))).toEqual(["smoothie-yoghurt-pisang"]);
    expect(ids(filterMatchesByPrefs(ranked, ["praktis", "tanpa-susu"])).sort()).toEqual(
      ["orak-arik-telur-wortel", "telur-dadar-bayam"].sort(),
    );
  });

  it("preserves rankRecipes order as a subsequence", () => {
    const out = ids(filterMatchesByPrefs(ranked, ["tanpa-susu"]));
    expect(out).toEqual(ids(ranked).filter((id) => out.includes(id)));
  });

  it("returns [] when nothing matches and ignores unknown ids", () => {
    expect(filterMatchesByPrefs(ranked, ["praktis", "tanpa-telur", "tanpa-susu"])).toEqual([]);
    expect(ids(filterMatchesByPrefs(ranked, ["bogus"]))).toEqual(ids(ranked));
  });
});

describe("recipe prefs store", () => {
  it("server snapshot is the defaults while the client snapshot reads storage", () => {
    window.localStorage.setItem(RECIPE_PREFS_KEY, JSON.stringify({ selected: ["praktis"] }));
    expect(getServerRecipePrefsSnapshot()).toEqual({ selected: [] });
    expect(getRecipePrefsSnapshot()).toEqual({ selected: ["praktis"] });
    expect(getRecipePrefsSnapshot()).toBe(getRecipePrefsSnapshot());
  });

  it("commit persists, updates the snapshot and notifies once", () => {
    const cb = vi.fn();
    const unsub = subscribeRecipePrefs(cb);
    expect(commitRecipePrefs({ selected: ["tanpa-susu"] })).toEqual({ ok: true });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(getRecipePrefsSnapshot()).toEqual({ selected: ["tanpa-susu"] });
    expect(window.localStorage.getItem(RECIPE_PREFS_KEY)).toBe(JSON.stringify({ selected: ["tanpa-susu"] }));
    unsub();
  });

  it("a failed commit leaves the snapshot and subscribers untouched", () => {
    const before = getRecipePrefsSnapshot();
    const cb = vi.fn();
    const unsub = subscribeRecipePrefs(cb);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(commitRecipePrefs({ selected: ["praktis"] }).ok).toBe(false);
    expect(getRecipePrefsSnapshot()).toBe(before);
    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it("never touches the pantry, profile or sidebar keys", () => {
    const seeded = {
      "loopan.pantry.v1": "pantry-sentinel",
      "loopan.profile.v1": "profile-sentinel",
      "loopan.ui.sidebar": "sidebar-sentinel",
    };
    for (const [k, v] of Object.entries(seeded)) window.localStorage.setItem(k, v);
    commitRecipePrefs({ selected: ["praktis"] });
    for (const [k, v] of Object.entries(seeded)) expect(window.localStorage.getItem(k)).toBe(v);
    expect(window.localStorage.length).toBe(4);
  });

  it("ignores storage events for other keys", () => {
    const cb = vi.fn();
    const unsub = subscribeRecipePrefs(cb);
    window.dispatchEvent(new StorageEvent("storage", { key: "loopan.profile.v1" }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent("storage", { key: RECIPE_PREFS_KEY }));
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
  });
});
