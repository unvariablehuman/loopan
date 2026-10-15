import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { URGENT_DAYS } from "@/lib/pantry-data";
import { RECIPE_PREFS_KEY } from "@/lib/recipe-prefs";
import { __resetRecipePrefsStoreForTests } from "@/lib/recipe-prefs-store";
import { Route as SettingsRoute } from "@/routes/settings";

const Settings = SettingsRoute.options.component!;

const stored = () => window.localStorage.getItem(RECIPE_PREFS_KEY);
const box = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;

beforeEach(() => {
  window.localStorage.clear();
  __resetRecipePrefsStoreForTests();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  __resetRecipePrefsStoreForTests();
});

describe("Settings: Preferensi resep", () => {
  it("replaces 'Statistik mingguan' with an accessible 'Preferensi resep' group", () => {
    render(<Settings />);
    expect(screen.queryByText("Statistik mingguan")).not.toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Preferensi resep" });
    const boxes = within(group).getAllByRole("checkbox");
    expect(boxes.map((b) => (b as HTMLInputElement).checked)).toEqual([false, false, false]);
    expect(within(group).getByRole("checkbox", { name: "Masakan praktis" })).toBeInTheDocument();
    expect(within(group).getByRole("checkbox", { name: "Tanpa telur" })).toBeInTheDocument();
    expect(within(group).getByRole("checkbox", { name: "Tanpa susu" })).toBeInTheDocument();
    expect(screen.getByText("Maksimal 15 menit")).toBeInTheDocument();
  });

  it("saves immediately under the new key and supports more than one choice", () => {
    render(<Settings />);
    fireEvent.click(box("Masakan praktis"));
    expect(box("Masakan praktis").checked).toBe(true);
    expect(stored()).toBe(JSON.stringify({ selected: ["praktis"] }));
    fireEvent.click(box("Tanpa susu"));
    expect(box("Masakan praktis").checked && box("Tanpa susu").checked).toBe(true);
    expect(stored()).toBe(JSON.stringify({ selected: ["praktis", "tanpa-susu"] }));
    fireEvent.click(box("Masakan praktis"));
    expect(stored()).toBe(JSON.stringify({ selected: ["tanpa-susu"] }));
  });

  it("restores the selection after a remount/reload", () => {
    const first = render(<Settings />);
    fireEvent.click(box("Tanpa telur"));
    first.unmount();
    __resetRecipePrefsStoreForTests(); // like a fresh page load: re-read from storage
    render(<Settings />);
    expect(box("Tanpa telur").checked).toBe(true);
    expect(box("Tanpa susu").checked).toBe(false);
  });

  it("falls back to nothing selected on corrupt stored data", () => {
    window.localStorage.setItem(RECIPE_PREFS_KEY, "{oops");
    render(<Settings />);
    expect(screen.getAllByRole("checkbox").every((b) => !(b as HTMLInputElement).checked)).toBe(true);
  });

  it("shows 'Hapus pilihan' only when something is selected and clears everything", () => {
    render(<Settings />);
    expect(screen.queryByRole("button", { name: "Hapus pilihan" })).not.toBeInTheDocument();
    fireEvent.click(box("Masakan praktis"));
    fireEvent.click(box("Tanpa telur"));
    fireEvent.click(screen.getByRole("button", { name: "Hapus pilihan" }));
    expect(screen.getAllByRole("checkbox").every((b) => !(b as HTMLInputElement).checked)).toBe(true);
    expect(stored()).toBe(JSON.stringify({ selected: [] }));
    expect(screen.queryByRole("button", { name: "Hapus pilihan" })).not.toBeInTheDocument();
  });

  it("does not toggle and shows an Indonesian error when saving fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    render(<Settings />);
    fireEvent.click(box("Masakan praktis"));
    expect(box("Masakan praktis").checked).toBe(false);
    expect(screen.getByRole("alert")).toHaveTextContent("Penyimpanan penuh");
  });
});

describe("Settings: existing toggles stay intact", () => {
  it("keeps the two switches, which flip as UI-only state and write nothing to storage", () => {
    render(<Settings />);
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);
    for (const name of ["Ringkasan prioritas harian", "Pengingat kedaluwarsa"]) {
      const sw = screen.getByRole("switch", { name });
      expect(sw).toHaveAttribute("aria-checked", "true");
      fireEvent.click(sw);
      expect(sw).toHaveAttribute("aria-checked", "false");
      fireEvent.click(sw);
      expect(sw).toHaveAttribute("aria-checked", "true");
    }
    expect(window.localStorage.length).toBe(0);
  });

  it("derives the reminder days from URGENT_DAYS", () => {
    render(<Settings />);
    expect(screen.getByText(`Peringatan ${URGENT_DAYS} hari sebelum sesuatu kedaluwarsa.`)).toBeInTheDocument();
    expect(screen.queryByText(/2 hari/)).not.toBeInTheDocument();
  });
});
