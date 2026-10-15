import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatPrice, toISODate, type PantryItem } from "@/lib/pantry-data";

let mockItems: PantryItem[] = [];
vi.mock("@/components/loopan/PantryContext", () => ({
  usePantry: () => ({ items: mockItems, ready: true, usedThisWeek: [], markUsed: vi.fn(), openEditor: vi.fn(), openScanner: vi.fn() }),
}));

// Import after the mock is registered.
import { PantryGlance } from "@/components/loopan/Widgets";

const day = (n: number) => toISODate(new Date(Date.now() + n * 86_400_000));
function makeItem(id: string, expiresOn: string, price?: number): PantryItem {
  return {
    id, name: id, category: "Dairy", quantity: "1", location: "Fridge",
    expiresOn, dateType: "use_by", price, addedAt: new Date().toISOString(),
  };
}

afterEach(() => {
  cleanup();
  mockItems = [];
});

describe("PantryGlance", () => {
  it("renders the title as one phrase with no forced line break", () => {
    render(<PantryGlance />);
    const heading = screen.getByRole("heading", { name: "Isi dapurmu sekilas" });
    expect(heading.querySelector("br")).toBeNull();
  });

  it("shows real counts and the summed at-risk value", () => {
    mockItems = [
      makeItem("a", day(1), 10000), // urgent
      makeItem("b", day(2), 6000), // urgent
      makeItem("c", day(30), 50000), // not urgent -> excluded from the at-risk value
    ];
    render(<PantryGlance />);

    expect(screen.getByText("barang").previousElementSibling).toHaveTextContent("3");
    expect(screen.getByText("segera kedaluwarsa").previousElementSibling).toHaveTextContent("2");

    const valueEl = screen.getByText("estimasi nilai berisiko").previousElementSibling as HTMLElement;
    // Compare ignoring whitespace: Intl inserts a non-breaking space after "Rp".
    expect(valueEl.textContent?.replace(/\s/g, "")).toBe(formatPrice(16000).replace(/\s/g, ""));
  });

  it("keeps the Rupiah amount on a single line (it must not be broken mid-number)", () => {
    mockItems = [makeItem("big", day(1), 100_000_000)];
    render(<PantryGlance />);
    const valueEl = screen.getByText("estimasi nilai berisiko").previousElementSibling as HTMLElement;
    // jsdom cannot measure layout, so assert the class that prevents the wrap.
    expect(valueEl).toHaveClass("whitespace-nowrap");
    expect(valueEl.className).not.toContain("overflow-wrap:anywhere");
  });
});
