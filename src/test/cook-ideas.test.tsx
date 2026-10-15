import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toISODate, type PantryItem } from "@/lib/pantry-data";
import { RECIPES } from "@/lib/recipes";
import { rankRecipes } from "@/lib/recipe-match";
import { RECIPE_PREFS_KEY } from "@/lib/recipe-prefs";
import { __resetRecipePrefsStoreForTests } from "@/lib/recipe-prefs-store";

// UseFirstSection (used for the integration check) reads usePantry and renders ProductCards.
let mockItems: PantryItem[] = [];
vi.mock("@/components/loopan/PantryContext", () => ({
  usePantry: () => ({ items: mockItems, ready: true, markUsed: vi.fn(), openEditor: vi.fn(), openScanner: vi.fn(), usedThisWeek: [] }),
}));

// Import after the mock is registered.
import { CookIdeas } from "@/components/loopan/CookIdeas";
import { UseFirstSection } from "@/components/loopan/Widgets";

const day = (n: number) => toISODate(new Date(Date.now() + n * 86_400_000));
function makeItem(name: string, expiresOn: string): PantryItem {
  return {
    id: name, name, category: "Vegetables", quantity: "1", location: "Fridge",
    expiresOn, dateType: "use_by", addedAt: new Date().toISOString(),
  };
}

// <Link> needs a router. Render the node as the root component with stub routes for the targets.
async function renderInRouter(node: ReactNode) {
  const root = createRootRoute({ component: () => <>{node}</> });
  const children = ["/", "/cook", "/use-first"].map((p) => createRoute({ getParentRoute: () => root, path: p, component: () => null }));
  const router = createRouter({ routeTree: root.addChildren(children), history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(<RouterProvider router={router} />);
  // RouterProvider mounts asynchronously; wait until the rendered node (always a <section>) is in.
  await waitFor(() => expect(document.querySelector("section")).not.toBeNull());
}

const region = () => screen.getByRole("region", { name: "Ide masak" });
const rowTitles = () => within(region()).queryAllByRole("link").map((l) => l.querySelector(".font-semibold")?.textContent);

beforeEach(() => {
  mockItems = [];
  window.localStorage.clear();
  __resetRecipePrefsStoreForTests();
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  __resetRecipePrefsStoreForTests();
});

describe("CookIdeas", () => {
  it("suggests recipes that use an urgent ingredient, in the same order as the ranker, capped at 2", async () => {
    const items = [makeItem("Bayam", day(1)), makeItem("Wortel", day(1)), makeItem("Telur", day(1))];
    await renderInRouter(<CookIdeas items={items} />);

    const expected = rankRecipes(RECIPES, items)
      .filter((m) => m.matched.length >= 1 && m.usesUrgent)
      .slice(0, 2)
      .map((m) => m.recipe.title);
    expect(expected.length).toBeGreaterThan(0);
    expect(rowTitles()).toEqual(expected);
    expect(within(region()).getByText("Ide masak untuk bahan yang segera kedaluwarsa")).toBeInTheDocument();
    for (const link of within(region()).getAllByRole("link")) expect(link).toHaveAttribute("href", "/cook");
  });

  it("uses the neutral heading when matching ingredients are not urgent", async () => {
    const items = [makeItem("Bayam", day(30))];
    await renderInRouter(<CookIdeas items={items} />);

    expect(within(region()).getByText("Ide masak dari isi dapurmu")).toBeInTheDocument();
    expect(within(region()).queryByText(/segera kedaluwarsa/)).not.toBeInTheDocument();
    expect(rowTitles().length).toBeGreaterThan(0);
  });

  it("only claims which ingredients exist (a count), never quantities or waste savings", async () => {
    await renderInRouter(<CookIdeas items={[makeItem("Bayam", day(1))]} />);
    const text = region().textContent ?? "";
    expect(text).toMatch(/\d+ dari \d+ bahan ada/);
    expect(text).not.toMatch(/hemat|terbuang|cukup/i);
  });

  it("falls back to a calm link to /cook when nothing matches", async () => {
    await renderInRouter(<CookIdeas items={[makeItem("Kopi bubuk", day(1))]} />);
    expect(within(region()).getByText(/Belum ada resep yang cocok/)).toBeInTheDocument();
    expect(within(region()).getByRole("link", { name: /Lihat ide resep/ })).toHaveAttribute("href", "/cook");
  });

  it("respects the recipe preferences from Pengaturan (same filter as /cook)", async () => {
    window.localStorage.setItem(RECIPE_PREFS_KEY, JSON.stringify({ selected: ["tanpa-telur"] }));
    __resetRecipePrefsStoreForTests();
    const items = [makeItem("Bayam", day(1)), makeItem("Telur", day(1))];
    await renderInRouter(<CookIdeas items={items} max={RECIPES.length} />);

    const withEgg = RECIPES.filter((r) => r.ingredients.some((i) => i.toLowerCase().split(/\s+/).includes("telur"))).map((r) => r.title);
    expect(withEgg.length).toBeGreaterThan(0);
    // Bayam still matches egg-free recipes (Sup Sayur Sederhana, Bubur Bayam), so the list is not empty.
    expect(rowTitles().length).toBeGreaterThan(0);
    for (const title of rowTitles()) expect(withEgg).not.toContain(title);
  });
});

describe("UseFirstSection on Beranda", () => {
  it("shows the Ide masak strip under the urgent cards", async () => {
    mockItems = [makeItem("Bayam", day(1))];
    await renderInRouter(<UseFirstSection />);
    expect(region()).toBeInTheDocument();
  });

  it("does not show it when nothing is urgent (the empty state fills the card instead)", async () => {
    mockItems = [makeItem("Bayam", day(30))];
    await renderInRouter(<UseFirstSection />);
    expect(screen.getByText("Belum ada yang mendesak")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ide masak" })).not.toBeInTheDocument();
  });
});
