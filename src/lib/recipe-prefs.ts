// Pure recipe-preference rules + persistence (no React). Audit of the catalog (src/lib/recipes.ts):
// a Recipe only has { id, title, minutes, servings?, ingredients, steps } - there are NO dietary,
// nutrition, protein or tag fields. So every preference is a rule over `minutes` or the ingredient
// names, nothing more:
//  - "Masakan praktis": minutes <= 15 (splits the real catalog 4/4; <= 20 would keep 6 of 8).
//  - "Tanpa telur" / "Tanpa susu": based on the ingredient list only (no allergy/safety claim).
//  - "Vegetarian" is omitted: no recipe has meat/fish words, so the rule would match 8/8 (a no-op)
//    and the catalog has no evidence about hidden animal-derived ingredients.
//  - "Tinggi protein" is omitted: there is no nutrition data, so any label would be invented.
// Preferences live under their OWN localStorage key and never touch the pantry/profile/sidebar keys.
import type { Recipe } from "./recipes";

export const RECIPE_PREFS_KEY = "loopan.recipe-prefs.v1";
export const RECIPE_PREFS_STORAGE_ERROR = "Penyimpanan penuh atau tidak tersedia. Perubahan belum tersimpan.";
export const PRACTICAL_MAX_MINUTES = 15;

// True when any ingredient (lowercased, split on whitespace) contains one of the given words as a token.
function hasIngredientWord(recipe: Recipe, words: readonly string[]): boolean {
  return recipe.ingredients.some((ing) => ing.toLowerCase().split(/\s+/).some((tok) => words.includes(tok)));
}

export const RECIPE_PREFS = [
  {
    id: "praktis",
    label: "Masakan praktis",
    rule: `Maksimal ${PRACTICAL_MAX_MINUTES} menit`,
    test: (r: Recipe): boolean => r.minutes <= PRACTICAL_MAX_MINUTES,
  },
  {
    id: "tanpa-telur",
    label: "Tanpa telur",
    rule: "Tidak ada telur di daftar bahan",
    test: (r: Recipe): boolean => !hasIngredientWord(r, ["telur"]),
  },
  {
    id: "tanpa-susu",
    label: "Tanpa susu",
    rule: "Tidak ada susu atau yoghurt di daftar bahan",
    test: (r: Recipe): boolean => !hasIngredientWord(r, ["susu", "yoghurt", "yogurt"]),
  },
] as const;

export type RecipePrefId = (typeof RECIPE_PREFS)[number]["id"];

export type RecipePrefs = { selected: RecipePrefId[] };

export const DEFAULT_RECIPE_PREFS: RecipePrefs = Object.freeze({
  selected: Object.freeze([]) as unknown as RecipePrefId[],
});

// Drops unknown ids and duplicates; result follows the canonical RECIPE_PREFS order.
export function sanitizeRecipePrefs(raw: unknown): RecipePrefs {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { selected: [] };
  const sel = (raw as Record<string, unknown>)["selected"];
  if (!Array.isArray(sel)) return { selected: [] };
  return { selected: RECIPE_PREFS.filter((p) => sel.includes(p.id)).map((p) => p.id) };
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

export function loadRecipePrefs(storage: Pick<Storage, "getItem"> | null = defaultReadStorage()): RecipePrefs {
  if (!storage) return sanitizeRecipePrefs(null);
  try {
    const raw = storage.getItem(RECIPE_PREFS_KEY);
    if (raw === null) return sanitizeRecipePrefs(null);
    return sanitizeRecipePrefs(JSON.parse(raw));
  } catch {
    return sanitizeRecipePrefs(null);
  }
}

export function saveRecipePrefs(
  prefs: RecipePrefs,
  storage: Pick<Storage, "setItem"> | null = defaultWriteStorage(),
): { ok: true } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: RECIPE_PREFS_STORAGE_ERROR };
  try {
    storage.setItem(RECIPE_PREFS_KEY, JSON.stringify(sanitizeRecipePrefs(prefs)));
    return { ok: true };
  } catch {
    return { ok: false, error: RECIPE_PREFS_STORAGE_ERROR };
  }
}

// AND semantics: every selected rule must pass. Empty selection passes everything. Unknown ids are
// ignored so a stale id can never hide all recipes.
export function recipeMatchesPrefs(recipe: Recipe, selected: readonly string[]): boolean {
  return RECIPE_PREFS.every((p) => !selected.includes(p.id) || p.test(recipe));
}

// Filters an already-ranked list; order is preserved and rankRecipes/matchRecipe are untouched.
export function filterMatchesByPrefs<T extends { recipe: Recipe }>(matches: T[], selected: readonly string[]): T[] {
  if (selected.length === 0) return matches;
  return matches.filter((m) => recipeMatchesPrefs(m.recipe, selected));
}
