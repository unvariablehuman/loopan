import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  rootRouteId,
  useRouterState,
} from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { type PantryItem } from "@/lib/pantry-data";
import { __resetOnboardingStoreForTests } from "@/lib/onboarding-store";

// AppShell's Header reads usePantry; mock it so these tests need no PantryProvider.
let mockItems: PantryItem[] = [];
vi.mock("@/components/loopan/PantryContext", () => ({
  usePantry: () => ({
    items: mockItems,
    ready: true,
    usedThisWeek: [],
    openScanner: vi.fn(),
    openEditor: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    markUsed: vi.fn(),
  }),
}));

// Import after the mock is registered.
import { AppShell } from "@/components/loopan/AppShell";

// Faithful reconstruction of RootComponent's conditional-AppShell branch: onboarding paths render
// a bare Outlet (full-screen, no sidebar); every other path renders inside AppShell. This is the
// exact rule in src/routes/__root.tsx.
const ONBOARDING_PATHS = ["/welcome", "/login", "/signup"];
const ALL_PATHS = ["/", "/pantry", "/use-first", "/cook", "/insights", "/settings", "/welcome", "/login", "/signup"];

function ConditionalShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return ONBOARDING_PATHS.includes(path) ? (
    <Outlet />
  ) : (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

async function renderAt(initialPath: string) {
  const rootRoute = createRootRoute({ component: ConditionalShell });
  const children = ALL_PATHS.map((p) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: p,
      component: () => <div>page {p}</div>,
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByText(`page ${initialPath}`);
}

beforeEach(() => {
  mockItems = [];
  window.localStorage.clear();
  __resetOnboardingStoreForTests();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  __resetOnboardingStoreForTests();
});

describe("onboarding routes resolve", () => {
  it.each(["/welcome", "/login", "/signup"])("%s matches its own route, not the root or not-found", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(path);
    expect(matches.at(-1)?.routeId).toBe(path);
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe("conditional AppShell", () => {
  it.each(["/welcome", "/login", "/signup"])("renders %s WITHOUT the sidebar nav", async (path) => {
    await renderAt(path);
    // The "Beranda" nav label only exists in AppShell's sidebar/bottom nav.
    expect(screen.queryByText("Beranda")).not.toBeInTheDocument();
    // No main navigation landmark from the shell.
    expect(screen.queryByLabelText("Beranda Loopan")).not.toBeInTheDocument();
  });

  it("renders the dashboard route / WITH the sidebar nav", async () => {
    await renderAt("/");
    await waitFor(() => expect(screen.getByLabelText("Beranda Loopan")).toBeInTheDocument());
    expect(screen.getAllByText("Beranda").length).toBeGreaterThan(0);
  });

  it("renders a non-onboarding route /pantry WITH the sidebar nav", async () => {
    await renderAt("/pantry");
    expect(screen.getAllByText("Beranda").length).toBeGreaterThan(0);
  });
});
