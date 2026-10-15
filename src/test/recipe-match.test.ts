import { describe, expect, it } from "vitest";
import { toISODate, type PantryItem } from "@/lib/pantry-data";
import { matchRecipe, normalize, rankRecipes } from "@/lib/recipe-match";
import { type Recipe } from "@/lib/recipes";

// Mirror pantry-data.test.ts: a fixed NOW drives daysLeft/ratio/tie-break assertions, while
// anything depending on isUrgent (which reads the real clock) is built from a fresh new Date()
// at call time so we only assert boundary behavior, never an exact calendar date.
function addDays(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
}
const NOW = new Date(2025, 0, 15);
const iso = (n: number) => toISODate(addDays(NOW, n));

// isUrgent reads the REAL clock, so a "not urgent" default date must be real-future, not
// relative to the fixed NOW (which may be in the past). Used as the item() default.
const FAR = toISODate(addDays(new Date(), 60));

function item(partial: Partial<PantryItem> & { name: string }): PantryItem {
  return {
    id: partial.id ?? partial.name,
    category: partial.category ?? "Other",
    quantity: partial.quantity ?? "1",
    location: partial.location ?? "Fridge",
    expiresOn: partial.expiresOn ?? FAR,
    dateType: partial.dateType ?? "use_by",
    addedAt: partial.addedAt ?? "2025-01-01T00:00:00.000Z",
    ...partial,
  };
}

function recipe(partial: Partial<Recipe> & { id: string; ingredients: string[] }): Recipe {
  return {
    title: partial.title ?? partial.id,
    minutes: partial.minutes ?? 10,
    steps: partial.steps ?? ["langkah"],
    ...partial,
  };
}

describe("normalize", () => {
  it("lowercases, trims, and collapses internal whitespace", () => {
    expect(normalize("  TeLur  Ayam ")).toBe("telur ayam");
    expect(normalize("Roti   Gandum\tUtuh")).toBe("roti gandum utuh");
  });
});

describe("matchRecipe — presence by name", () => {
  it("matches an exact name (Telur <-> telur)", () => {
    const r = recipe({ id: "r", ingredients: ["telur"] });
    const m = matchRecipe(r, [item({ name: "Telur" })], NOW);
    expect(m.matched).toEqual(["telur"]);
    expect(m.missing).toEqual([]);
    expect(m.matchRatio).toBe(1);
  });

  it("normalizes case and surrounding/internal whitespace via alias", () => {
    const r = recipe({ id: "r", ingredients: ["telur"] });
    const m = matchRecipe(r, [item({ name: "  TeLur  Ayam " })], NOW);
    expect(m.matched).toEqual(["telur"]); // "telur ayam" is an alias of telur
  });

  it("matches an alias (pantry 'susu uht' <-> ingredient 'susu')", () => {
    const r = recipe({ id: "r", ingredients: ["susu"] });
    const m = matchRecipe(r, [item({ name: "Susu UHT" })], NOW);
    expect(m.matched).toEqual(["susu"]);
  });

  it("matches a guarded substring (pantry 'Roti gandum utuh' <-> 'roti', len >= 4)", () => {
    const r = recipe({ id: "r", ingredients: ["roti"] });
    const m = matchRecipe(r, [item({ name: "Roti gandum utuh" })], NOW);
    expect(m.matched).toEqual(["roti"]);
  });

  it("guards short-token false positives (<4 chars require exact match)", () => {
    // ingredient "air" (3 chars) must NOT match a longer unrelated pantry name by substring.
    const r = recipe({ id: "r", ingredients: ["air"] });
    const m = matchRecipe(r, [item({ name: "Air mineral kemasan" })], NOW);
    expect(m.missing).toEqual(["air"]);
    // But an exact "Air" still matches regardless of the length guard.
    const m2 = matchRecipe(r, [item({ name: "Air" })], NOW);
    expect(m2.matched).toEqual(["air"]);
  });

  it("reports a missing ingredient and a reduced ratio", () => {
    const r = recipe({ id: "r", ingredients: ["telur", "tomat"] });
    const m = matchRecipe(r, [item({ name: "Telur" })], NOW);
    expect(m.matched).toEqual(["telur"]);
    expect(m.missing).toEqual(["tomat"]);
    expect(m.matchRatio).toBeCloseTo(1 / 2);
  });

  it("computes a partial ratio (1 of 3)", () => {
    const r = recipe({ id: "r", ingredients: ["telur", "tomat", "keju"] });
    const m = matchRecipe(r, [item({ name: "Telur" })], NOW);
    expect(m.matchRatio).toBeCloseTo(1 / 3);
  });

  it("treats an empty pantry as all-missing with ratio 0", () => {
    const r = recipe({ id: "r", ingredients: ["telur", "susu"] });
    const m = matchRecipe(r, [], NOW);
    expect(m.matched).toEqual([]);
    expect(m.missing).toEqual(["telur", "susu"]);
    expect(m.matchRatio).toBe(0);
    expect(m.usesUrgent).toBe(false);
    expect(m.urgentCount).toBe(0);
  });
});

describe("matchRecipe — urgency via isUrgent", () => {
  it("flags a matched item within 3 days as urgent", () => {
    const today = new Date();
    const soon = toISODate(addDays(today, 2));
    const r = recipe({ id: "r", ingredients: ["telur"] });
    const m = matchRecipe(r, [item({ name: "Telur", expiresOn: soon })]);
    expect(m.usesUrgent).toBe(true);
    expect(m.urgentCount).toBe(1);
  });

  it("treats an invalid or missing expiresOn as urgent", () => {
    const r = recipe({ id: "r", ingredients: ["telur", "susu"] });
    const m = matchRecipe(r, [
      item({ name: "Telur", expiresOn: "not-a-date" }),
      item({ name: "Susu", expiresOn: "" }),
    ]);
    expect(m.usesUrgent).toBe(true);
    expect(m.urgentCount).toBe(2);
  });

  it("does not flag a far-future matched item as urgent", () => {
    const today = new Date();
    const far = toISODate(addDays(today, 30));
    const r = recipe({ id: "r", ingredients: ["telur"] });
    const m = matchRecipe(r, [item({ name: "Telur", expiresOn: far })]);
    expect(m.usesUrgent).toBe(false);
    expect(m.urgentCount).toBe(0);
  });
});

describe("rankRecipes", () => {
  it("ranks a fuller match higher when neither uses urgent items", () => {
    const full = recipe({ id: "full", ingredients: ["telur", "susu"] });
    const partial = recipe({ id: "partial", ingredients: ["telur", "tomat"] });
    const items = [item({ name: "Telur" }), item({ name: "Susu" })]; // both far-future
    const ranked = rankRecipes([partial, full], items, NOW);
    expect(ranked[0]!.recipe.id).toBe("full");
    expect(ranked[1]!.recipe.id).toBe("partial");
  });

  it("boosts an equal-ratio recipe that uses an urgent item above one that does not", () => {
    // isUrgent reads the real clock, so build both dates from a fresh new Date().
    const today = new Date();
    const soon = toISODate(addDays(today, 1)); // urgent (within 3 days)
    const later = toISODate(addDays(today, 30)); // not urgent (real-future)
    const urgentRecipe = recipe({ id: "urgent", ingredients: ["bayam"] });
    const calmRecipe = recipe({ id: "calm", ingredients: ["wortel"] });
    const items = [
      item({ name: "Bayam", expiresOn: soon }), // urgent
      item({ name: "Wortel", expiresOn: later }), // not urgent
    ];
    const ranked = rankRecipes([calmRecipe, urgentRecipe], items);
    expect(ranked[0]!.recipe.id).toBe("urgent");
    expect(ranked[1]!.recipe.id).toBe("calm");
  });

  it("returns all-missing ratio-0 matches for an empty pantry", () => {
    const r1 = recipe({ id: "r1", ingredients: ["telur"] });
    const r2 = recipe({ id: "r2", ingredients: ["susu", "roti"] });
    const ranked = rankRecipes([r1, r2], [], NOW);
    expect(ranked.every((m) => m.matchRatio === 0 && !m.usesUrgent)).toBe(true);
    expect(ranked.length).toBe(2);
  });
});
