import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PROFILE_KEY } from "@/lib/profile";
import { __resetProfileStoreForTests } from "@/lib/profile-store";

// jsdom CANNOT verify: real layout, the modal's fit on a short screen or phone, the width
// transition, canvas photo cropping, or real browser focus behaviour. Those are manual browser
// tests (listed in .agents/tasks/sidebar-profile-verification.md).
//
// This feature never reads or writes the pantry storage key; we only assert which keys exist.

vi.mock("@/components/loopan/PantryContext", () => ({
  usePantry: () => ({
    items: [],
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

import { AppShell } from "@/components/loopan/AppShell";

const SIDEBAR_KEY = "loopan.ui.sidebar";
const NAV_PATHS = ["/", "/pantry", "/use-first", "/cook", "/insights", "/settings"];
const NAV_LABELS = ["Beranda", "Dapur Saya", "Prioritas", "Resep", "Pengaturan"];
const STORAGE_ERROR = "Penyimpanan penuh atau tidak tersedia. Perubahan belum tersimpan.";

async function renderShell() {
  const rootRoute = createRootRoute({
    component: () => (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
  });
  const children = NAV_PATHS.map((p) => createRoute({ getParentRoute: () => rootRoute, path: p, component: () => null }));
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(screen.getByLabelText("Beranda Loopan")).toBeInTheDocument());
}

const aside = () => document.querySelector("aside") as HTMLElement;
const trigger = (scope: HTMLElement = aside()) => within(scope).getByRole("button", { name: /^Edit profil, / });
const stored = () => JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "null");
const seed = (p: object) => window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
const dialog = () => screen.getByRole("dialog", { name: "Edit profil" });
const queryDialog = () => screen.queryByRole("dialog", { name: "Edit profil" });
const nameInput = () => within(dialog()).getByRole("textbox", { name: "Nama pengguna" });
const kitchenInput = () => within(dialog()).getByRole("textbox", { name: "Nama dapur" });

function openDialog(scope: HTMLElement = aside()) {
  fireEvent.click(trigger(scope));
  return dialog();
}

beforeEach(() => {
  window.localStorage.clear();
  __resetProfileStoreForTests();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("profile trigger", () => {
  it("shows the default profile with an accessible name when nothing is stored", async () => {
    await renderShell();
    const t = trigger();
    expect(t).toHaveAccessibleName("Edit profil, Sabrina");
    expect(t).toHaveAttribute("type", "button");
    expect(t).toHaveAttribute("aria-haspopup", "dialog");
    expect(within(t).getByText("Sabrina")).toBeInTheDocument();
    expect(within(t).getByText("Dapur rumah")).toBeInTheDocument();
  });

  it("shows the stored name and kitchen", async () => {
    seed({ name: "Ayu", kitchen: "Dapur Kos", avatar: { kind: "preset", id: "sprout" } });
    await renderShell();
    expect(trigger()).toHaveAccessibleName("Edit profil, Ayu");
    expect(within(trigger()).getByText("Dapur Kos")).toBeInTheDocument();
  });
});

describe("clicking the profile area", () => {
  it("opens the dialog directly under document.body and focuses Nama pengguna", async () => {
    await renderShell();
    expect(queryDialog()).not.toBeInTheDocument();
    const d = openDialog();
    expect(d).toHaveAttribute("aria-modal", "true");
    expect(d.closest("aside")).toBeNull();
    expect(d.parentElement?.parentElement).toBe(document.body);
    expect(nameInput()).toHaveFocus();
    expect(nameInput()).toHaveValue("Sabrina");
    expect(kitchenInput()).toHaveValue("Dapur rumah");
  });

  it("never renders a dropdown: no menu, no menuitems, no separate avatar/kitchen actions", async () => {
    await renderShell();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
    openDialog();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
    expect(screen.queryByRole("menuitem", { name: "Ganti avatar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Ubah nama dapur" })).not.toBeInTheDocument();
    expect(screen.queryByText("Ganti avatar")).not.toBeInTheDocument();
    expect(screen.queryByText("Ubah nama dapur")).not.toBeInTheDocument();
  });

  it("does not duplicate navigation inside the dialog", async () => {
    await renderShell();
    const d = openDialog();
    for (const label of NAV_LABELS) expect(within(d).queryByText(label)).not.toBeInTheDocument();
    expect(within(d).queryAllByRole("link")).toHaveLength(0);
  });
});

describe("edit profile dialog", () => {
  it("Batal discards edits and returns focus to the trigger", async () => {
    await renderShell();
    openDialog();
    fireEvent.change(nameInput(), { target: { value: "Budi" } });
    // Edits stay local while the dialog is open.
    expect(trigger()).toHaveAccessibleName("Edit profil, Sabrina");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Batal" }));
    expect(queryDialog()).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Edit profil, Sabrina");
    expect(window.localStorage.getItem(PROFILE_KEY)).toBeNull();
    expect(trigger()).toHaveFocus();
    // Reopening shows stored values, not the discarded draft.
    openDialog();
    expect(nameInput()).toHaveValue("Sabrina");
  });

  it("Escape discards edits and returns focus to the trigger", async () => {
    await renderShell();
    openDialog();
    fireEvent.change(nameInput(), { target: { value: "Budi" } });
    fireEvent.keyDown(nameInput(), { key: "Escape" });
    expect(queryDialog()).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Edit profil, Sabrina");
    expect(window.localStorage.getItem(PROFILE_KEY)).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("backdrop click discards edits and returns focus to the trigger", async () => {
    await renderShell();
    openDialog();
    fireEvent.change(nameInput(), { target: { value: "Budi" } });
    fireEvent.click(dialog().parentElement as HTMLElement);
    expect(queryDialog()).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Edit profil, Sabrina");
    expect(window.localStorage.getItem(PROFILE_KEY)).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("Simpan updates the sidebar immediately, persists, and closes", async () => {
    await renderShell();
    openDialog();
    fireEvent.change(nameInput(), { target: { value: "  Budi " } });
    fireEvent.change(kitchenInput(), { target: { value: "Dapur Kos" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Simpan" }));
    expect(queryDialog()).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Edit profil, Budi");
    expect(within(trigger()).getByText("Dapur Kos")).toBeInTheDocument();
    expect(stored()).toEqual({ name: "Budi", kitchen: "Dapur Kos", avatar: { kind: "initial" } });
    expect(trigger()).toHaveFocus();
  });

  it("restores the saved profile after a simulated refresh", async () => {
    await renderShell();
    openDialog();
    fireEvent.change(nameInput(), { target: { value: "Budi" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Simpan" }));
    cleanup();
    __resetProfileStoreForTests();
    await renderShell();
    expect(trigger()).toHaveAccessibleName("Edit profil, Budi");
  });

  it("only writes its own keys (no other storage is touched by the profile feature)", async () => {
    await renderShell();
    openDialog();
    fireEvent.change(nameInput(), { target: { value: "Budi" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Simpan" }));
    const keys = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i)).sort();
    expect(keys).toEqual([PROFILE_KEY, SIDEBAR_KEY].sort());
  });

  it.each([
    ["name", "", "Masukkan nama"],
    ["name", "a".repeat(41), "Maksimal 40 karakter"],
    ["kitchen", "   ", "Masukkan nama dapur"],
    ["kitchen", "b".repeat(41), "Maksimal 40 karakter"],
  ] as const)("blocks saving an invalid %s (%j)", async (which, value, message) => {
    await renderShell();
    openDialog();
    const input = which === "name" ? nameInput() : kitchenInput();
    fireEvent.change(input, { target: { value } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Simpan" }));
    expect(dialog()).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    const err = within(dialog()).getByText(message);
    expect(input.getAttribute("aria-describedby")).toBe(err.id);
    expect(window.localStorage.getItem(PROFILE_KEY)).toBeNull();
    expect(input).toHaveFocus();
  });

  it("keeps the dialog open with an Indonesian alert when storage fails", async () => {
    await renderShell();
    openDialog();
    fireEvent.change(nameInput(), { target: { value: "Budi" } });
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === PROFILE_KEY) throw new Error("QuotaExceededError");
      return original.call(this, k, v);
    });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Simpan" }));
    expect(within(dialog()).getByRole("alert")).toHaveTextContent(STORAGE_ERROR);
    expect(dialog()).toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Edit profil, Sabrina");
  });

  it("traps Tab inside the dialog", async () => {
    await renderShell();
    openDialog();
    const close = within(dialog()).getByRole("button", { name: "Tutup" });
    const save = within(dialog()).getByRole("button", { name: "Simpan" });
    save.focus();
    fireEvent.keyDown(save, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(save).toHaveFocus();
  });

  it("persists a chosen preset avatar", async () => {
    await renderShell();
    openDialog();
    fireEvent.click(within(dialog()).getByRole("radio", { name: "Avatar daun" }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Simpan" }));
    expect(stored().avatar).toEqual({ kind: "preset", id: "leaf" });
  });

  it("rejects a non-image upload with an Indonesian message and keeps the draft avatar", async () => {
    await renderShell();
    openDialog();
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const input = dialog().querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute("accept", "image/*");
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(await within(dialog()).findByRole("alert")).toHaveTextContent("Pilih file gambar (JPG, PNG, atau WebP).");
    expect(within(dialog()).getByRole("radio", { name: "Avatar inisial" })).toBeChecked();
  });
});

describe("mobile drawer profile", () => {
  it("opens the dialog from the drawer, Escape closes only the dialog, and saving updates both placements", async () => {
    seed({ name: "Ayu", kitchen: "Dapur Kos", avatar: { kind: "initial" } });
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }));
    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(trigger(drawer)).toHaveAccessibleName("Edit profil, Ayu");
    expect(within(drawer).getByText("Dapur Kos")).toBeInTheDocument();

    openDialog(drawer);
    expect(nameInput()).toHaveFocus();
    fireEvent.keyDown(nameInput(), { key: "Escape" });
    expect(queryDialog()).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
    expect(trigger(drawer)).toHaveFocus();

    openDialog(drawer);
    fireEvent.change(nameInput(), { target: { value: "Budi" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Simpan" }));
    expect(trigger(drawer)).toHaveAccessibleName("Edit profil, Budi");
    expect(trigger(aside())).toHaveAccessibleName("Edit profil, Budi");
  });
});

describe("collapsed sidebar", () => {
  it("shows the avatar only, keeps an accessible name and tooltip, and opens the dialog on click", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Tutup sidebar" }));
    const t = trigger();
    expect(t).toHaveAccessibleName("Edit profil, Sabrina");
    expect(t).toHaveAttribute("title", "Sabrina · Dapur rumah");
    expect(within(aside()).queryByText("Sabrina")).not.toBeInTheDocument();
    expect(within(aside()).queryByText("Dapur rumah")).not.toBeInTheDocument();
    fireEvent.click(t);
    expect(nameInput()).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("gives every collapsed control a tooltip", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Tutup sidebar" }));
    expect(within(aside()).getByRole("button", { name: "Buka sidebar" })).toHaveAttribute("title", "Buka sidebar");
    for (const label of NAV_LABELS) {
      expect(within(aside()).getByRole("link", { name: label })).toHaveAttribute("title", label);
    }
  });
});

describe("sidebar toggle persistence", () => {
  it("swaps the label and writes loopan.ui.sidebar", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Tutup sidebar" }));
    expect(screen.getByRole("button", { name: "Buka sidebar" })).toBeInTheDocument();
    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe("collapsed");
    fireEvent.click(screen.getByRole("button", { name: "Buka sidebar" }));
    expect(screen.getByRole("button", { name: "Tutup sidebar" })).toBeInTheDocument();
    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe("expanded");
  });

  it("restores a stored collapsed preference after mount without overwriting it", async () => {
    window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
    await renderShell();
    await waitFor(() => expect(aside()).toHaveAttribute("data-collapsed", "true"));
    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe("collapsed");
  });
});
