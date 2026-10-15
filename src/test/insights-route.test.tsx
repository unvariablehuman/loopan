import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatPrice, type PantryItem } from "@/lib/pantry-data";
import type { UsedEntry } from "@/components/loopan/PantryContext";

// Mock usePantry so the test controls the inventory. The /insights page reads
// items, used, usedThisWeek, ready; ThisWeek (right column) also reads usedThisWeek.
let mockItems: PantryItem[] = [];
let mockUsed: UsedEntry[] = [];
let mockUsedThisWeek: UsedEntry[] = [];
let mockReady = true;

vi.mock("@/components/loopan/PantryContext", () => ({
  usePantry: () => ({
    items: mockItems,
    used: mockUsed,
    usedThisWeek: mockUsedThisWeek,
    ready: mockReady,
    openScanner: vi.fn(),
    openEditor: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    markUsed: vi.fn(),
  }),
}));

// Import after the mock is registered.
import { Route as InsightsRoute } from "@/routes/insights";

const Insights = InsightsRoute.options.component!;
const NAV_PATHS = ["/", "/pantry", "/use-first", "/cook", "/insights", "/settings"];

function makeItem(partial: Partial<PantryItem> & { id: string }): PantryItem {
  return {
    name: partial.id,
    category: "Other",
    quantity: "1",
    location: "Fridge",
    expiresOn: "2099-12-31", // far-future → not urgent unless overridden
    dateType: "use_by",
    addedAt: "2025-01-01T00:00:00.000Z",
    ...partial,
  };
}

// Insights' right column renders ThisWeek, which uses a TanStack <Link>, so render inside a router.
function renderInsights(initialPath = "/insights") {
  const rootRoute = createRootRoute({ component: () => <Insights /> });
  const children = NAV_PATHS.map((p) =>
    createRoute({ getParentRoute: () => rootRoute, path: p, component: () => null }),
  );
  const routeTree = rootRoute.addChildren(children);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  mockItems = [];
  mockUsed = [];
  mockUsedThisWeek = [];
  mockReady = true;
});

afterEach(() => cleanup());

describe("/insights summary cards", () => {
  it("renders the three summary cards with correct real values from the pantry", async () => {
    // Two priced items (10000 + 20000) and one with no price (counts as 0) → total 30000.
    // One item is near-term (urgent via isUrgent), the other two are far-future.
    mockItems = [
      makeItem({ id: "a", price: 10000, expiresOn: "2099-12-31" }),
      makeItem({ id: "b", price: 20000, expiresOn: "2099-12-31" }),
      makeItem({ id: "c", expiresOn: "2000-01-01" }), // past date → urgent
    ];
    renderInsights();

    // Each card renders its value as a sibling of its label; assert against the card container
    // (label's grandparent) so the chart's identical numbers never cause ambiguity.
    const cardValue = (label: string) =>
      screen.getByText(label).parentElement!.querySelector(".text-lg")!.textContent;

    // Card 1 — total items.
    expect(await screen.findByText("Barang di dapur")).toBeInTheDocument();
    expect(cardValue("Barang di dapur")).toBe("3");

    // Card 2 — urgent count (only the past-dated item).
    expect(screen.getByText("Perlu segera digunakan")).toBeInTheDocument();
    expect(cardValue("Perlu segera digunakan")).toBe("1");

    // Card 3 — estimated inventory value via formatPrice over summed prices.
    expect(screen.getByText("Estimasi nilai dapur")).toBeInTheDocument();
    expect(cardValue("Estimasi nilai dapur")).toBe(formatPrice(30000));
  });

  it("shows the empty state when both items and used are empty", async () => {
    mockItems = [];
    mockUsed = [];
    mockUsedThisWeek = [];
    renderInsights();

    expect(await screen.findByText("Statistik akan muncul di sini")).toBeInTheDocument();
    // Summary cards must not render in the empty state.
    expect(screen.queryByText("Barang di dapur")).not.toBeInTheDocument();
  });
});
