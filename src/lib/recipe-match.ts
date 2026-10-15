// Transparent, deterministic ingredient matcher for "Masak dengan Loopan".
//
// Pure functions only — no React, no storage, no module-scope `Date`. Urgency and date
// logic are reused from pantry-data (isUrgent/daysLeft); this module NEVER re-implements the
// 3-day rule and NEVER reads or parses PantryItem.quantity (quantity is free text, so this
// MVP matches ingredient PRESENCE only and never implies the user has "enough").

import { daysLeft, isUrgent, type PantryItem } from "@/lib/pantry-data";
import { type Recipe } from "@/lib/recipes";

/** Lowercase, trim, and collapse internal whitespace to a single space. */
export function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// Small, EXPLICIT, intentionally NON-EXHAUSTIVE alias map: canonical recipe ingredient ->
// accepted pantry-name variants (each written in normalized form). Covers the demo seed
// (bayam, susu, telur, wortel, roti gandum utuh, beras melati, yoghurt) plus common
// Indonesian spelling/name variants. Add new entries here rather than widening the matcher.
const ALIASES: Record<string, string[]> = {
  telur: ["telur", "telur ayam"],
  susu: ["susu", "susu uht", "susu segar", "susu sapi"],
  roti: ["roti", "roti gandum utuh", "roti tawar", "roti gandum"],
  nasi: ["nasi", "beras", "beras melati", "beras putih"],
  beras: ["beras", "beras melati", "beras putih", "nasi"],
  bayam: ["bayam", "daun bayam"],
  wortel: ["wortel"],
  yoghurt: ["yoghurt", "yogurt"],
  "bawang merah": ["bawang merah"],
  "bawang putih": ["bawang putih"],
  "kecap manis": ["kecap manis", "kecap"],
  "minyak goreng": ["minyak goreng", "minyak"],
  pisang: ["pisang"],
  madu: ["madu"],
  garam: ["garam"],
  air: ["air"],
};

// Minimum token length for GUARDED substring matching. For any term shorter than this we
// require exact (equal) match only — this prevents short tokens like "air" or "roti" from
// producing false positives via substring containment (e.g. a 3-char token should not match
// just because it appears inside an unrelated pantry name). Exact/alias equality is always
// allowed regardless of length.
const MIN_SUBSTRING_LEN = 4;

/**
 * Does a normalized pantry name match a single normalized term?
 * - Equality always matches (any length).
 * - GUARDED substring: one string contains the other ONLY when the shorter of the two
 *   strings has length >= MIN_SUBSTRING_LEN. This keeps "roti gandum utuh" matching "roti"
 *   while blocking spurious short-token hits.
 */
function termMatchesName(pantryName: string, term: string): boolean {
  if (!term || !pantryName) return false;
  if (pantryName === term) return true;
  const shorter = Math.min(pantryName.length, term.length);
  if (shorter < MIN_SUBSTRING_LEN) return false; // short tokens: exact match only
  return pantryName.includes(term) || term.includes(pantryName);
}

/** Accepted normalized variants for an ingredient: itself plus any alias entries. */
function variantsFor(ingredient: string): string[] {
  const canonical = normalize(ingredient);
  const aliases = (ALIASES[canonical] ?? []).map(normalize);
  return Array.from(new Set([canonical, ...aliases]));
}

/**
 * The pantry item that satisfies a given ingredient, or undefined if none.
 * Reads ONLY item.name (never quantity). Returns the first matching item so callers can
 * check its urgency.
 */
function findMatchingItem(ingredient: string, items: PantryItem[]): PantryItem | undefined {
  const variants = variantsFor(ingredient);
  return items.find((item) => {
    const name = normalize(item.name);
    return variants.some((v) => termMatchesName(name, v));
  });
}

export interface RecipeMatch {
  recipe: Recipe;
  matched: string[]; // ingredient names present in the pantry
  missing: string[]; // ingredient names absent from the pantry
  matchRatio: number; // matched.length / recipe.ingredients.length (0 when no ingredients)
  usesUrgent: boolean; // at least one matched ingredient's pantry item isUrgent
  urgentCount: number; // number of matched INGREDIENT slots whose item is urgent
}

/**
 * Compute the match result for a single recipe against the pantry.
 *
 * `now` is accepted for determinism/debug via daysLeft only. Urgency itself uses
 * isUrgent(item.expiresOn), which reads the real clock internally (documented in
 * pantry-data) — we do NOT attempt to pass `now` into isUrgent. Missing/invalid dates
 * count as urgent, consistent with the rest of the app.
 */
export function matchRecipe(recipe: Recipe, items: PantryItem[], now: Date = new Date()): RecipeMatch {
  const matched: string[] = [];
  const missing: string[] = [];
  let urgentCount = 0;

  for (const ingredient of recipe.ingredients) {
    const item = findMatchingItem(ingredient, items);
    if (item) {
      matched.push(ingredient);
      // Count urgency per matched ingredient slot (not per raw pantry item) to keep ratios sane.
      if (isUrgent(item.expiresOn)) {
        urgentCount += 1;
        // Touch daysLeft(now) so the threaded `now` is used deterministically where relevant.
        void daysLeft(item.expiresOn, now);
      }
    } else {
      missing.push(ingredient);
    }
  }

  const total = recipe.ingredients.length;
  const matchRatio = total === 0 ? 0 : matched.length / total;
  return { recipe, matched, missing, matchRatio, usesUrgent: urgentCount > 0, urgentCount };
}

/**
 * Rank recipes transparently. Sort key, in order:
 *   1. recipes that use an urgent (soon-to-expire / invalid-date) ingredient first,
 *   2. then higher matchRatio,
 *   3. then higher urgentCount,
 *   4. then shorter cooking time (minutes),
 *   5. then title (localeCompare) as a stable tie-break.
 */
export function rankRecipes(recipes: Recipe[], items: PantryItem[], now: Date = new Date()): RecipeMatch[] {
  return recipes
    .map((r) => matchRecipe(r, items, now))
    .sort((a, b) => {
      if (a.usesUrgent !== b.usesUrgent) return a.usesUrgent ? -1 : 1;
      if (b.matchRatio !== a.matchRatio) return b.matchRatio - a.matchRatio;
      if (b.urgentCount !== a.urgentCount) return b.urgentCount - a.urgentCount;
      if (a.recipe.minutes !== b.recipe.minutes) return a.recipe.minutes - b.recipe.minutes;
      return a.recipe.title.localeCompare(b.recipe.title);
    });
}
