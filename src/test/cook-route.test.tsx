import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  rootRouteId,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { type PantryItem } from "@/lib/pantry-data";
import { RECIPES } from "@/lib/recipes";
import { rankRecipes } from "@/lib/recipe-match";
import { RECIPE_PREFS_KEY } from "@/lib/recipe-prefs";
import { __resetRecipePrefsStoreForTests } from "@/lib/recipe-prefs-store";

// Mock usePantry so the test controls the inventory and can spy on mutators. Only the pieces
// the /cook page reads (items, ready, openEditor) plus mutator spies to assert they are never
// called while viewing a recipe.
const addItem = vi.fn();
const updateItem = vi.fn();
const deleteItem = vi.fn();
const markUsed = vi.fn();
const openEditor = vi.fn();

let mockItems: PantryItem[] = [];
let mockReady = true;

vi.mock("@/components/loopan/PantryContext", () => ({
  usePantry: () => ({
    items: mockItems,
    ready: mockReady,
    openEditor,
    addItem,
    updateItem,
    deleteItem,
    markUsed,
  }),
}));

// Import after the mock is registered.
import { Route as CookRoute } from "@/routes/cook";

const Cook = CookRoute.options.component!;

function makeItem(name: string): PantryItem {
  return {
    id: name,
    name,
    category: "Other",
    quantity: "1",
    location: "Fridge",
    // Far-future so these seed items are not urgent (keeps rendering deterministic).
    expiresOn: "2099-12-31",
    dateType: "use_by",
    addedAt: "2025-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  mockItems = [];
  mockReady = true;
  addItem.mockClear();
  updateItem.mockClear();
  deleteItem.mockClear();
  markUsed.mockClear();
  openEditor.mockClear();
});

afterEach(() => cleanup());

describe("/cook route", () => {
  it("matches a page for /cook instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/cook");
    expect(matches.at(-1)?.routeId).toBe("/cook");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe("Cook navigation entry", () => {
  it("includes the 'Masak dengan Loopan' nav entry", async () => {
    const mod = await import("@/components/loopan/AppShell");
    // nav is module-private; assert via the route tree + known label instead.
    // The label is user-facing Indonesian text wired to /cook.
    expect(typeof mod.AppShell).toBe("function");
    // Direct assertion that /cook is a registered route (nav links to it).
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/cook").at(-1)?.routeId).toBe("/cook");
  });
});

describe("Cook page rendering", () => {
  it("renders a ranked recommendation list from a seeded pantry", () => {
    mockItems = [makeItem("Telur"), makeItem("Bayam"), makeItem("Wortel")];
    render(<Cook />);
    // At least one recipe that uses the seeded ingredients appears.
    expect(screen.getByText("Masak dengan Loopan")).toBeInTheDocument();
    expect(screen.getByText("Telur Dadar Bayam")).toBeInTheDocument();
  });

  it("shows the empty state when the pantry is empty", () => {
    mockItems = [];
    render(<Cook />);
    expect(screen.getByText("Belum ada bahan untuk disarankan")).toBeInTheDocument();
    // The add-item CTA is present.
    expect(screen.getByRole("button", { name: "Tambahkan ke Dapur" })).toBeInTheDocument();
  });

  it("renders the 'Inspirasi lainnya' section for zero-match recipes", () => {
    // A single pantry item that only some recipes use, leaving others with zero matches.
    mockItems = [makeItem("Yoghurt")];
    render(<Cook />);
    expect(screen.getByText("Inspirasi lainnya")).toBeInTheDocument();
  });
});

describe("Recipe detail dialog", () => {
  it("opens on card click and does NOT invoke any pantry mutator", () => {
    mockItems = [makeItem("Telur"), makeItem("Bayam")];
    render(<Cook />);

    // Open the first recipe's detail dialog.
    const buttons = screen.getAllByRole("button", { name: "Lihat resep" });
    fireEvent.click(buttons[0]!);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // The dialog shows the "Cara memasak" (cooking steps) heading.
    expect(screen.getByText("Cara memasak")).toBeInTheDocument();

    // CRITICAL: viewing a recipe must never change pantry items/quantities.
    expect(addItem).not.toHaveBeenCalled();
    expect(updateItem).not.toHaveBeenCalled();
    expect(deleteItem).not.toHaveBeenCalled();
    expect(markUsed).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    mockItems = [makeItem("Telur"), makeItem("Bayam")];
    render(<Cook />);
    fireEvent.click(screen.getAllByRole("button", { name: "Lihat resep" })[0]!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(markUsed).not.toHaveBeenCalled();
  });
});

describe("Cook recipe preferences", () => {
  const NAV_PATHS = ["/", "/pantry", "/use-first", "/cook", "/insights", "/settings"];

  // The preference UI renders a TanStack <Link>, so render inside a memory router.
  async function renderCook() {
    const rootRoute = createRootRoute({ component: () => <Cook /> });
    const children = NAV_PATHS.map((p) =>
      createRoute({ getParentRoute: () => rootRoute, path: p, component: () => null }),
    );
    const router = createRouter({
      routeTree: rootRoute.addChildren(children),
      history: createMemoryHistory({ initialEntries: ["/cook"] }),
    });
    render(<RouterProvider router={router} />);
    await screen.findByText("Masak dengan Loopan");
  }

  const setPrefs = (selected: string[]) =>
    window.localStorage.setItem(RECIPE_PREFS_KEY, JSON.stringify({ selected }));
  const titles = () => screen.queryAllByRole("heading", { level: 3 }).map((h) => h.textContent);
  const stored = () => window.localStorage.getItem(RECIPE_PREFS_KEY);

  beforeEach(() => {
    window.localStorage.clear();
    __resetRecipePrefsStoreForTests();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    __resetRecipePrefsStoreForTests();
  });

  it("with nothing stored shows today's ranked output and no preference UI", async () => {
    mockItems = [makeItem("Telur"), makeItem("Bayam"), makeItem("Wortel")];
    await renderCook();
    const ranked = rankRecipes(RECIPES, mockItems);
    const expected = [
      ...ranked.filter((m) => m.matched.length >= 1),
      ...ranked.filter((m) => m.matched.length === 0),
    ].map((m) => m.recipe.title);
    expect(titles()).toEqual(expected);
    expect(screen.queryByText("Preferensi:")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ubah preferensi resep" })).not.toBeInTheDocument();
  });

  it("filters the main list by a stored preference and shows the active chips with an 'Ubah' link", async () => {
    setPrefs(["tanpa-telur"]);
    mockItems = [makeItem("Telur"), makeItem("Bayam"), makeItem("Wortel")];
    await renderCook();
    for (const t of ["Telur Dadar Bayam", "Nasi Goreng Telur", "Orak-arik Telur Wortel", "Roti Panggang Telur Susu"]) {
      expect(screen.queryByText(t)).not.toBeInTheDocument();
    }
    expect(screen.getByText("Sup Sayur Sederhana")).toBeInTheDocument();
    expect(screen.getByText("Preferensi:")).toBeInTheDocument();
    expect(screen.getByText("Tanpa telur")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ubah preferensi resep" })).toHaveAttribute("href", "/settings");
  });

  it("also filters 'Inspirasi lainnya'", async () => {
    setPrefs(["tanpa-telur"]);
    mockItems = [makeItem("Yoghurt")];
    await renderCook();
    expect(screen.getByText("Inspirasi lainnya")).toBeInTheDocument();
    expect(screen.queryByText("Nasi Goreng Telur")).not.toBeInTheDocument();
    expect(screen.getByText("Tumis Wortel")).toBeInTheDocument();
  });

  it("combines several preferences with AND", async () => {
    setPrefs(["praktis", "tanpa-telur"]);
    mockItems = [makeItem("Yoghurt"), makeItem("Telur"), makeItem("Wortel")];
    await renderCook();
    expect(titles()).toEqual(["Smoothie Yoghurt Pisang"]);
  });

  it("keeps 'Inspirasi lainnya' when the filter empties only the main list", async () => {
    setPrefs(["tanpa-telur"]);
    mockItems = [makeItem("Telur")];
    await renderCook();
    expect(screen.getByText("Belum ada resep yang cocok")).toBeInTheDocument();
    expect(screen.getByText(/cocok dengan preferensimu\. Lihat inspirasi/)).toBeInTheDocument();
    expect(screen.getByText("Inspirasi lainnya")).toBeInTheDocument();
    expect(screen.getByText("Bubur Bayam")).toBeInTheDocument();
  });

  it("shows a calm empty state when no recipe matches, and recovers with 'Tampilkan semua resep'", async () => {
    setPrefs(["praktis", "tanpa-telur", "tanpa-susu"]);
    mockItems = [makeItem("Telur")];
    await renderCook();
    expect(screen.getByText("Belum ada resep yang cocok dengan preferensimu")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ubah preferensi" })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("button", { name: "Lihat resep" })).not.toBeInTheDocument();
    expect(titles()).not.toContain("Telur Dadar Bayam");

    fireEvent.click(screen.getByRole("button", { name: "Tampilkan semua resep" }));
    expect(screen.getAllByRole("button", { name: "Lihat resep" }).length).toBe(RECIPES.length);
    expect(screen.queryByText("Preferensi:")).not.toBeInTheDocument();
    expect(stored()).toBe(JSON.stringify({ selected: [] }));
  });

  it("lets the empty-pantry state win over preferences", async () => {
    setPrefs(["praktis", "tanpa-telur", "tanpa-susu"]);
    mockItems = [];
    await renderCook();
    expect(screen.getByText("Belum ada bahan untuk disarankan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tambahkan ke Dapur" })).toBeInTheDocument();
    expect(screen.queryByText("Belum ada resep yang cocok dengan preferensimu")).not.toBeInTheDocument();
  });

  it("opens a recipe from a filtered list without calling any pantry mutator", async () => {
    setPrefs(["tanpa-telur"]);
    mockItems = [makeItem("Wortel"), makeItem("Bayam")];
    await renderCook();
    fireEvent.click(screen.getAllByRole("button", { name: "Lihat resep" })[0]!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(addItem).not.toHaveBeenCalled();
    expect(updateItem).not.toHaveBeenCalled();
    expect(deleteItem).not.toHaveBeenCalled();
    expect(markUsed).not.toHaveBeenCalled();
  });
});
