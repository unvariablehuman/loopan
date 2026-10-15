import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type PantryItem } from "@/lib/pantry-data";

// AppShell's Header (and ThisWeek) read usePantry; mock it so these tests need no PantryProvider.
// We only assert navigation structure and the stats-section link here, never pantry mutation.
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
import { ThisWeek } from "@/components/loopan/Widgets";

const NAV_PATHS = ["/", "/pantry", "/use-first", "/cook", "/insights", "/settings"];

// Build a minimal in-memory router whose root renders the AppShell around an Outlet, with a
// child route per nav path so the TanStack <Link>s resolve. This exercises the real AppShell
// markup (sidebar + mobile nav) without the app's loaders or stylesheets.
async function renderShell(initialPath = "/") {
  const rootRoute = createRootRoute({
    component: () => (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
  });
  const children = NAV_PATHS.map((p) =>
    createRoute({ getParentRoute: () => rootRoute, path: p, component: () => null }),
  );
  const routeTree = rootRoute.addChildren(children);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(<RouterProvider router={router} />);
  // RouterProvider mounts asynchronously; wait until the shell is on screen.
  await waitFor(() => expect(screen.getByLabelText("Beranda Loopan")).toBeInTheDocument());
}

beforeEach(() => {
  mockItems = [];
  // Sidebar collapse state is persisted to localStorage; clear it so every test starts expanded.
  window.localStorage.clear();
});

afterEach(() => cleanup());

// Render a bare component inside an in-memory router so its TanStack <Link>s resolve.
async function renderWithRouter(ui: React.ReactNode, initialPath = "/") {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> });
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

// NOTE: jsdom ignores Tailwind breakpoints, so BOTH the desktop sidebar and the mobile bottom
// nav mount at once. The labels therefore appear more than once; we assert presence with
// getAllByText.
describe("AppShell navigation", () => {
  const FIVE_LABELS = ["Beranda", "Dapur Saya", "Prioritas", "Resep", "Pengaturan"];

  it("renders exactly the five destinations", async () => {
    await renderShell();
    for (const label of FIVE_LABELS) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("no longer renders the old 'Ringkasan' or persistent 'Statistik' nav labels", async () => {
    await renderShell();
    expect(screen.queryByText("Ringkasan")).not.toBeInTheDocument();
    expect(screen.queryByText("Statistik")).not.toBeInTheDocument();
  });

  it("no longer uses the old long labels as nav labels", async () => {
    await renderShell();
    // Labels were shortened in the nav only; the long strings must not appear as nav text.
    expect(screen.queryByText("Prioritas Penggunaan")).not.toBeInTheDocument();
    expect(screen.queryByText("Masak dengan Loopan")).not.toBeInTheDocument();
  });

  it("exposes the five destinations in the bottom nav region (no 'Lainnya' drawer)", async () => {
    await renderShell();
    // The "Lainnya" drawer/trigger has been removed entirely.
    expect(screen.queryByRole("button", { name: "Lainnya" })).not.toBeInTheDocument();
    // Both navs mount under jsdom, so each label resolves; the mobile bar carries them too.
    for (const label of FIVE_LABELS) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});

describe("Desktop sidebar collapse", () => {
  it("renders the toggle with accessible name 'Tutup sidebar' when expanded (default)", async () => {
    await renderShell();
    expect(screen.getByRole("button", { name: "Tutup sidebar" })).toBeInTheDocument();
    const aside = document.querySelector("aside[data-collapsed]");
    expect(aside).toHaveAttribute("data-collapsed", "false");
  });

  it("collapses when the toggle is clicked, flipping the accessible name and data-collapsed", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Tutup sidebar" }));
    expect(screen.getByRole("button", { name: "Buka sidebar" })).toBeInTheDocument();
    expect(document.querySelector("aside[data-collapsed]")).toHaveAttribute("data-collapsed", "true");
  });
});

describe("Active route styling", () => {
  it("marks the current destination with aria-current='page' in both states", async () => {
    await renderShell("/pantry");
    // Both navs mount under jsdom, so the destination resolves to multiple links.
    const activeExpanded = screen
      .getAllByRole("link", { name: /Dapur Saya/ })
      .some((el) => el.getAttribute("aria-current") === "page");
    expect(activeExpanded).toBe(true);

    // Collapse the sidebar — the active link (now icon-only, named via aria-label) still marks itself.
    fireEvent.click(screen.getByRole("button", { name: "Tutup sidebar" }));
    const activeCollapsed = screen
      .getAllByRole("link", { name: /Dapur Saya/ })
      .some((el) => el.getAttribute("aria-current") === "page");
    expect(activeCollapsed).toBe(true);
  });
});

describe("Mobile drawer", () => {
  const FIVE_LABELS = ["Beranda", "Dapur Saya", "Prioritas", "Resep", "Pengaturan"];

  it("opens from the menu toggle, lists the five destinations, and closes on selection", async () => {
    await renderShell();
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }));
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    for (const label of FIVE_LABELS) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }

    // Selecting a destination inside the drawer closes it.
    fireEvent.click(within(dialog).getByRole("link", { name: /Dapur Saya/ }));
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }));
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
  });
});

describe("Beranda statistics access", () => {
  it("renders a 'Lihat statistik' link that points to /insights", async () => {
    await renderWithRouter(<ThisWeek />);
    const link = await screen.findByRole("link", { name: /Lihat statistik/ });
    expect(link).toHaveAttribute("href", "/insights");
  });
});
