import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toISODate, type PantryItem } from "@/lib/pantry-data";

const markUsed = vi.fn();
const openEditor = vi.fn();
vi.mock("@/components/loopan/PantryContext", () => ({
  usePantry: () => ({ items: [], ready: true, markUsed, openEditor, openScanner: vi.fn(), usedThisWeek: [] }),
}));

// Import after the mock is registered.
import { ProductCard } from "@/components/loopan/Widgets";

const item: PantryItem = {
  id: "milk",
  name: "Susu UHT",
  category: "Dairy",
  quantity: "1 L",
  location: "Fridge",
  expiresOn: toISODate(new Date(Date.now() + 2 * 86_400_000)),
  dateType: "use_by",
  price: 16000,
  addedAt: new Date().toISOString(),
};

beforeEach(() => {
  markUsed.mockClear();
  openEditor.mockClear();
});
afterEach(() => cleanup());

describe("ProductCard detail dialog", () => {
  it("opens from 'Lihat detail' and is rendered OUTSIDE the card, directly under document.body", () => {
    const { container } = render(<ProductCard p={item} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Lihat detail/ }));

    const dialog = screen.getByRole("dialog");
    const card = container.querySelector("article")!;
    // Regression guard: the card has `hover:-translate-y-0.5` + `overflow-hidden`, which would
    // squeeze/clip a `position: fixed` dialog nested inside it. jsdom can't compute that
    // layout, so assert the structural cause instead: the dialog must not live inside the card.
    expect(card).not.toContainElement(dialog);
    expect(dialog.parentElement).toBe(document.body);
  });

  it("shows the item's details", () => {
    render(<ProductCard p={item} />);
    fireEvent.click(screen.getByRole("button", { name: /Lihat detail/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Susu UHT")).toBeInTheDocument();
    expect(within(dialog).getByText(/Jumlah: 1 L/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Perkiraan harga: Rp/)).toBeInTheDocument();
  });

  it("closes on Escape, on the Tutup button, and on backdrop click", () => {
    render(<ProductCard p={item} />);
    const open = () => fireEvent.click(screen.getByRole("button", { name: /Lihat detail/ }));

    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    open();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Tutup" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    open();
    fireEvent.click(screen.getByRole("dialog")); // backdrop is the dialog root
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("'Tandai digunakan' calls markUsed once and closes the dialog", () => {
    render(<ProductCard p={item} />);
    fireEvent.click(screen.getByRole("button", { name: /Lihat detail/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Tandai digunakan/ }));

    expect(markUsed).toHaveBeenCalledTimes(1);
    expect(markUsed).toHaveBeenCalledWith("milk");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Edit button has an accessible name and opens the editor for this item", () => {
    render(<ProductCard p={item} />);
    fireEvent.click(screen.getByRole("button", { name: /Lihat detail/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Edit Susu UHT" }));

    expect(openEditor).toHaveBeenCalledWith({ mode: "edit", item });
    expect(markUsed).not.toHaveBeenCalled();
  });

  it("opening the dialog alone never mutates the pantry", () => {
    render(<ProductCard p={item} />);
    fireEvent.click(screen.getByRole("button", { name: /Lihat detail/ }));
    expect(markUsed).not.toHaveBeenCalled();
    expect(openEditor).not.toHaveBeenCalled();
  });
});

describe("ProductCard surface", () => {
  it("is a single button that opens the detail dialog (no separate 'Lihat detail' control)", () => {
    const { container } = render(<ProductCard p={item} />);
    // Exactly one interactive control on the card itself (the stretched overlay); no action row.
    const card = container.querySelector("article")!;
    const buttons = within(card).getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName("Lihat detail Susu UHT");
    // The card does not surface Tandai digunakan / Edit until the dialog is opened.
    expect(within(card).queryByRole("button", { name: /Tandai digunakan/ })).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /^Edit / })).not.toBeInTheDocument();
  });

  it("keeps secondary info (quantity, price) off the card and only in the dialog", () => {
    const { container } = render(<ProductCard p={item} />);
    const card = container.querySelector("article")!;
    // Name, location/category and the expiry date are on the card; quantity and price are not.
    expect(within(card).getByText("Susu UHT")).toBeInTheDocument();
    expect(within(card).queryByText(/Jumlah/)).not.toBeInTheDocument();
    expect(within(card).queryByText(/Rp/)).not.toBeInTheDocument();
  });

  it("allows a long name to wrap instead of truncating to one line", () => {
    const longName = "Roti gandum utuh panggang dengan biji bunga matahari";
    const { container } = render(<ProductCard p={{ ...item, name: longName }} />);
    const nameEl = within(container.querySelector("article")!).getByText(longName);
    expect(nameEl).toHaveClass("line-clamp-2");
    expect(nameEl).not.toHaveClass("truncate");
  });
});
