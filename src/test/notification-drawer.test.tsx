import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toISODate, type PantryItem } from "@/lib/pantry-data";

// NOTE: jsdom cannot verify the slide-in animation, reduced-motion behaviour, real layout, viewport
// clipping, short-screen fit, the sticky-header containing-block issue, or true browser focus rings.
// We assert structure (portal, scroll container classes, ARIA, focus, links) and list the rest as
// manual browser tests in the verification note.

let mockItems: PantryItem[] = [];
let mockReady = true;
vi.mock("@/components/loopan/PantryContext", () => ({
  usePantry: () => ({
    items: mockItems,
    ready: mockReady,
    usedThisWeek: [],
    openScanner: vi.fn(),
    openEditor: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    markUsed: vi.fn(),
  }),
}));

import { AppShell } from "@/components/loopan/AppShell";

const NAV_PATHS = ["/", "/pantry", "/use-first", "/cook", "/insights", "/settings"];

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
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(screen.getByLabelText("Beranda Loopan")).toBeInTheDocument());
}

const today = new Date();
const at = (n: number) => toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
function item(id: string, name: string, expiresOn: string, over: Partial<PantryItem> = {}): PantryItem {
  return {
    id,
    name,
    category: "Dairy",
    quantity: "1",
    location: "Fridge",
    expiresOn,
    dateType: "use_by",
    addedAt: "2025-05-01T00:00:00.000Z",
    ...over,
  };
}
const alertItems = () => [
  item("milk", "Susu", at(-2)),
  item("yogurt", "Yoghurt", at(0)),
  item("spinach", "Bayam", at(2), { dateType: "best_before", category: "Vegetables" }),
  item("eggs", "Telur", at(20)),
  item("bread", "Roti", "2025-13-40"),
];

const bell = () => document.querySelector("header")!.querySelector<HTMLButtonElement>('button[aria-label^="Notifikasi"]')!;
const openDrawer = () => fireEvent.click(bell());
const getDialog = () => screen.getByRole("dialog", { name: "Notifikasi" });

beforeEach(() => {
  mockItems = [];
  mockReady = true;
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe("Header cleanup", () => {
  it("removes the decorative leaf and keeps the search box, menu button, logo link and bell", async () => {
    await renderShell();
    const header = document.querySelector("header")!;
    expect(header.querySelector(".lucide-sprout")).toBeNull();
    expect(header.querySelectorAll('button[aria-label^="Notifikasi"]')).toHaveLength(1);
    expect(within(header).getByLabelText("Cari dapur")).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Buka menu" })).toBeInTheDocument();
    expect(within(header).getByLabelText("Beranda Loopan")).toBeInTheDocument();
  });

  it("gives the bell dialog semantics and a name starting with 'Notifikasi'", async () => {
    await renderShell();
    expect(bell()).toHaveAttribute("aria-haspopup", "dialog");
    expect(bell()).toHaveAttribute("aria-expanded", "false");
    expect(bell().getAttribute("aria-label")).toMatch(/^Notifikasi/);
  });
});

describe("Notification drawer behaviour", () => {
  beforeEach(() => {
    mockItems = alertItems();
  });

  it("opens a modal dialog portalled to document.body (not inside the header)", async () => {
    await renderShell();
    expect(screen.queryByRole("dialog", { name: "Notifikasi" })).not.toBeInTheDocument();
    openDrawer();
    const dialog = getDialog();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.closest("header")).toBeNull();
    const overlay = dialog.closest("[data-notification-overlay]")!;
    expect(overlay.parentElement).toBe(document.body);
    expect(bell()).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("button", { name: "Tutup" })).toHaveFocus();
  });

  it("keeps the title and close button outside a separate scroll container", async () => {
    await renderShell();
    openDrawer();
    const dialog = getDialog();
    const list = dialog.querySelector<HTMLElement>("[data-notification-list]")!;
    expect(list).toBeTruthy();
    expect(list.className).toContain("overflow-y-auto");
    expect(list.className).toContain("min-h-0");
    expect(within(dialog).getByRole("heading", { name: "Notifikasi" })).toBeInTheDocument();
    expect(list.contains(within(dialog).getByRole("heading", { name: "Notifikasi" }))).toBe(false);
    expect(list.contains(within(dialog).getByRole("button", { name: "Tutup" }))).toBe(false);
    // Fixed to the right edge with rounded left corners (class-level check only).
    expect(dialog.className).toContain("right-0");
    expect(dialog.className).toContain("rounded-l-2xl");
  });

  it.each([
    ["the close button", () => fireEvent.click(within(getDialog()).getByRole("button", { name: "Tutup" }))],
    ["a backdrop click", () => fireEvent.click(screen.getByTestId("notification-backdrop"))],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
  ])("closes via %s and returns focus to the bell", async (_label, close) => {
    await renderShell();
    openDrawer();
    close();
    expect(screen.queryByRole("dialog", { name: "Notifikasi" })).not.toBeInTheDocument();
    expect(bell()).toHaveAttribute("aria-expanded", "false");
    expect(bell()).toHaveFocus();
  });

  it("does not close when clicking inside the panel", async () => {
    await renderShell();
    openDrawer();
    fireEvent.click(within(getDialog()).getByRole("heading", { name: "Notifikasi" }));
    expect(getDialog()).toBeInTheDocument();
  });

  it("traps Tab inside the panel", async () => {
    await renderShell();
    openDrawer();
    const dialog = getDialog();
    const close = within(dialog).getByRole("button", { name: "Tutup" });
    const all = within(dialog).getByRole("link", { name: /Lihat semua di Prioritas/ });
    all.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(all).toHaveFocus();
  });
});

describe("Notification drawer content", () => {
  beforeEach(() => {
    mockItems = alertItems();
  });

  it("lists real urgent items with their status, groups, and omits non-urgent ones", async () => {
    await renderShell();
    openDrawer();
    const dialog = getDialog();
    for (const name of ["Susu", "Yoghurt", "Bayam", "Roti"]) {
      expect(within(dialog).getByText(name)).toBeInTheDocument();
    }
    expect(within(dialog).queryByText("Telur")).not.toBeInTheDocument();
    expect(within(dialog).getByText("lewat tanggal pakai 2 hari")).toBeInTheDocument();
    expect(within(dialog).getByText("kedaluwarsa hari ini")).toBeInTheDocument();
    expect(within(dialog).getByText("baik sebelum 2 hari lagi")).toBeInTheDocument();
    expect(within(dialog).getByText("Periksa tanggal")).toBeInTheDocument();
    for (const h of ["Sudah kedaluwarsa", "Segera kedaluwarsa", "Perlu dicek tanggalnya"]) {
      expect(within(dialog).getByRole("heading", { name: h })).toBeInTheDocument();
    }
  });

  it("links rows to /pantry with the search param and the footer to /use-first", async () => {
    await renderShell();
    openDrawer();
    const dialog = getDialog();
    expect(within(dialog).getByRole("link", { name: /^Susu/ })).toHaveAttribute("href", "/pantry?q=Susu");
    expect(within(dialog).getByRole("link", { name: /Bayam/ })).toHaveAttribute("href", "/pantry?q=Bayam");
    expect(within(dialog).getByRole("link", { name: /Lihat semua di Prioritas/ })).toHaveAttribute("href", "/use-first");
  });

  it("closes when a row or the Prioritas link is clicked", async () => {
    await renderShell();
    openDrawer();
    fireEvent.click(within(getDialog()).getByRole("link", { name: /^Susu/ }));
    expect(screen.queryByRole("dialog", { name: "Notifikasi" })).not.toBeInTheDocument();

    openDrawer();
    fireEvent.click(within(getDialog()).getByRole("link", { name: /Lihat semua di Prioritas/ }));
    expect(screen.queryByRole("dialog", { name: "Notifikasi" })).not.toBeInTheDocument();
  });

  it("shows the empty state for an empty pantry and for only non-urgent items", async () => {
    for (const items of [[], [item("eggs", "Telur", at(20))]]) {
      mockItems = items;
      await renderShell();
      openDrawer();
      const dialog = getDialog();
      expect(within(dialog).getByText("Belum ada notifikasi")).toBeInTheDocument();
      expect(within(dialog).getByText("Peringatan kedaluwarsa dari isi dapurmu akan muncul di sini.")).toBeInTheDocument();
      expect(within(dialog).queryByRole("link", { name: /Lihat semua di Prioritas/ })).not.toBeInTheDocument();
      cleanup();
    }
  });

  it("never shows the empty state before the store is ready", async () => {
    mockReady = false;
    await renderShell();
    openDrawer();
    expect(screen.queryByText("Belum ada notifikasi")).not.toBeInTheDocument();
    expect(within(getDialog()).queryByRole("link", { name: /^Susu/ })).not.toBeInTheDocument();
  });
});

describe("Bell indicator", () => {
  it("shows a dot (no count) only when alerts exist", async () => {
    mockItems = alertItems();
    await renderShell();
    expect(screen.getByTestId("notification-dot")).toBeInTheDocument();
    expect(bell()).toHaveAttribute("aria-label", "Notifikasi, ada peringatan");
    expect(bell().textContent).toBe("");
    expect(bell().textContent).not.toMatch(/\d/);
  });

  it("has no dot for an empty pantry", async () => {
    await renderShell();
    expect(screen.queryByTestId("notification-dot")).not.toBeInTheDocument();
    expect(bell()).toHaveAttribute("aria-label", "Notifikasi");
  });

  it("has no dot before the store is ready", async () => {
    mockItems = alertItems();
    mockReady = false;
    await renderShell();
    expect(screen.queryByTestId("notification-dot")).not.toBeInTheDocument();
    expect(bell()).toHaveAttribute("aria-label", "Notifikasi");
  });
});

describe("Regression: existing header and shell controls", () => {
  it("keeps the sidebar toggle, search and profile controls while the drawer is open", async () => {
    mockItems = alertItems();
    await renderShell();
    openDrawer();
    expect(screen.getByRole("button", { name: "Tutup sidebar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cari dapur")).toBeInTheDocument();
    expect(document.querySelector("aside")!.textContent).toBeTruthy();
  });
});
