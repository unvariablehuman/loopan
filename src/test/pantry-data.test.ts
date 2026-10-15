import { describe, expect, it } from "vitest";
import { daysLeft, formatPrice, isUrgent, statusLabel, statusOf, toISODate, URGENT_DAYS } from "@/lib/pantry-data";

// Build date strings relative to a fixed reference so these assertions never depend on the
// machine clock. daysLeft accepts a `now` param; isUrgent uses the real `new Date()` default, so
// for isUrgent we derive inputs from a fresh `new Date()` at call time (still deterministic since
// we only assert the <= URGENT_DAYS boundary, never an exact calendar date).
function addDays(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
}

const NOW = new Date(2025, 0, 15); // fixed reference (Jan 15 2025, local)
const iso = (n: number) => toISODate(addDays(NOW, n));

describe("daysLeft", () => {
  it("counts whole days from the reference date", () => {
    expect(daysLeft(iso(3), NOW)).toBe(3);
    expect(daysLeft(iso(4), NOW)).toBe(4);
    expect(daysLeft(iso(0), NOW)).toBe(0);
    expect(daysLeft(iso(-2), NOW)).toBe(-2);
  });
  it("returns null for missing or invalid dates", () => {
    expect(daysLeft("not-a-date", NOW)).toBeNull();
    expect(daysLeft("", NOW)).toBeNull();
    expect(daysLeft("2025-13-40", NOW)).toBeNull();
  });
});

describe("statusOf", () => {
  it("maps day counts to statuses", () => {
    expect(statusOf(daysLeft(iso(3), NOW))).toBe("soon");
    expect(statusOf(daysLeft(iso(4), NOW))).toBe("ok");
    expect(statusOf(daysLeft(iso(0), NOW))).toBe("today");
    expect(statusOf(daysLeft(iso(-1), NOW))).toBe("past");
    expect(statusOf(daysLeft("not-a-date", NOW))).toBe("invalid");
  });
});

describe("isUrgent — shared 3-day rule", () => {
  it("uses URGENT_DAYS = 3 as the threshold", () => {
    expect(URGENT_DAYS).toBe(3);
  });
  it("is urgent at or within 3 days, today, past, and for invalid/missing dates", () => {
    const today = new Date();
    expect(isUrgent(toISODate(addDays(today, 3)))).toBe(true); // 3 days => urgent
    expect(isUrgent(toISODate(addDays(today, 0)))).toBe(true); // today => urgent
    expect(isUrgent(toISODate(addDays(today, -5)))).toBe(true); // expired => urgent
    expect(isUrgent("not-a-date")).toBe(true); // invalid => urgent
    expect(isUrgent("")).toBe(true); // missing => urgent
  });
  it("is NOT urgent at 4 days", () => {
    const today = new Date();
    expect(isUrgent(toISODate(addDays(today, 4)))).toBe(false);
  });
});

describe("statusLabel", () => {
  it("includes the day count for the 'soon' status", () => {
    expect(statusLabel(daysLeft(iso(3), NOW))).toBe("Segera gunakan · 3 hr");
  });
  it("labels today, ok, and invalid", () => {
    expect(statusLabel(daysLeft(iso(0), NOW))).toBe("Gunakan hari ini");
    expect(statusLabel(daysLeft(iso(4), NOW))).toBe("Belum mendesak");
    expect(statusLabel(daysLeft("not-a-date", NOW))).toBe("Periksa tanggal");
  });
  it("uses different past wording for use_by vs best_before", () => {
    const past = daysLeft(iso(-1), NOW);
    expect(statusLabel(past, "use_by")).toBe("Lewat tanggal pakai");
    expect(statusLabel(past, "best_before")).toBe("Lewat tanggal terbaik");
  });
});

describe("formatPrice — Rupiah, no decimals", () => {
  it("renders with the Rp prefix and no dollar sign", () => {
    const s = formatPrice(15000);
    expect(s.startsWith("Rp")).toBe(true);
    expect(s).not.toContain("$");
  });
  it("rounds decimal inputs to whole Rupiah (no fractional part)", () => {
    // maximumFractionDigits: 0 — a legacy decimal demo value renders rounded, never with a
    // comma/decimal fraction. Assert on structure, not exact grouping glyphs (ICU-dependent).
    const s = formatPrice(4.2);
    expect(s).not.toContain(",");
    expect(s.replace(/\D/g, "")).toBe("4");
  });
  it("groups large values and keeps them a single unbreakable render string", () => {
    const s = formatPrice(100000000);
    expect(s.startsWith("Rp")).toBe(true);
    expect(s.replace(/\D/g, "")).toBe("100000000");
  });
});
