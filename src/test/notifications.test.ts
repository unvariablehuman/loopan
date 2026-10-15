import { describe, expect, it } from "vitest";
import { isUrgent, toISODate, URGENT_DAYS, type PantryItem } from "@/lib/pantry-data";
import { deriveNotifications, groupNotifications } from "@/lib/notifications";

// Fixed reference so wording/ordering never depends on the machine clock. Only the final
// consistency test uses the real clock, because isUrgent() has no `now` parameter.
const NOW = new Date(2025, 4, 26, 10, 0, 0);
const at = (n: number, base: Date = NOW) => toISODate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + n));

function item(id: string, expiresOn: string, over: Partial<PantryItem> = {}): PantryItem {
  return {
    id,
    name: id,
    category: "Dairy",
    quantity: "1",
    location: "Fridge",
    expiresOn,
    dateType: "use_by",
    addedAt: "2025-05-01T00:00:00.000Z",
    ...over,
  };
}

describe("deriveNotifications", () => {
  it("returns [] for an empty list and for items that are not urgent", () => {
    expect(deriveNotifications([], NOW)).toEqual([]);
    expect(deriveNotifications([item("a", at(4)), item("b", at(30))], NOW)).toEqual([]);
  });

  it("includes the URGENT_DAYS boundary (3) and excludes 4", () => {
    expect(URGENT_DAYS).toBe(3);
    const out = deriveNotifications([item("in", at(3)), item("out", at(4))], NOW);
    expect(out.map((n) => n.itemId)).toEqual(["in"]);
    expect(out[0]).toMatchObject({ kind: "soon", days: 3 });
  });

  it("orders expired (most overdue first), today, soon (fewest days first), then invalid last", () => {
    const out = deriveNotifications(
      [
        item("soon3", at(3)),
        item("bad", "2025-13-40"),
        item("exp1", at(-1)),
        item("today", at(0)),
        item("soon1", at(1)),
        item("exp5", at(-5)),
        item("missing", ""),
      ],
      NOW,
    );
    expect(out.map((n) => n.itemId)).toEqual(["exp5", "exp1", "today", "soon1", "soon3", "bad", "missing"]);
    expect(out.map((n) => n.kind)).toEqual(["expired", "expired", "today", "soon", "soon", "invalid", "invalid"]);
  });

  it("treats invalid and missing dates as 'invalid' with days === null", () => {
    const out = deriveNotifications([item("x", "2025-13-40"), item("y", "")], NOW);
    expect(out).toHaveLength(2);
    for (const n of out) {
      expect(n.kind).toBe("invalid");
      expect(n.days).toBeNull();
      expect(n.detail).toBe("Periksa tanggal");
    }
  });

  it("words the detail from the day count and date type", () => {
    const d = (n: number, dateType: PantryItem["dateType"]) =>
      deriveNotifications([item("x", at(n), { name: "Susu", dateType })], NOW)[0]!;
    expect(d(-2, "use_by").detail).toBe("lewat tanggal pakai 2 hari");
    expect(d(-2, "best_before").detail).toBe("lewat tanggal terbaik 2 hari");
    expect(d(0, "use_by").detail).toBe("kedaluwarsa hari ini");
    expect(d(0, "best_before").detail).toBe("baik sebelum hari ini");
    expect(d(1, "use_by").detail).toBe("kedaluwarsa besok");
    expect(d(1, "best_before").detail).toBe("baik sebelum besok");
    expect(d(3, "use_by").detail).toBe("kedaluwarsa 3 hari lagi");
    expect(d(3, "best_before").detail).toBe("baik sebelum 3 hari lagi");
    expect(d(-2, "use_by").text).toBe("Susu · lewat tanggal pakai 2 hari");
    expect(d(1, "use_by").text).toBe("Susu · kedaluwarsa besok");
  });

  it("is deterministic for a fixed now and does not mutate its input", () => {
    const items = [item("b", at(2)), item("a", at(-3)), item("c", "")];
    const snapshot = JSON.stringify(items);
    const first = deriveNotifications(items, NOW);
    expect(deriveNotifications(items, NOW)).toEqual(first);
    expect(JSON.stringify(items)).toBe(snapshot);
  });

  it("changes as the clock moves (derived, not stored)", () => {
    const items = [item("m", at(3))];
    expect(deriveNotifications(items, NOW)[0]).toMatchObject({ kind: "soon", days: 3 });
    const later = new Date(2025, 4, 29, 8, 0, 0);
    expect(deriveNotifications(items, later)[0]).toMatchObject({ kind: "today", days: 0 });
  });

  it("gives stable, unique ids", () => {
    const items = [item("a", at(1)), item("b", at(1)), item("c", at(-1))];
    const first = deriveNotifications(items, NOW);
    const ids = first.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(["notif:a", "notif:b", "notif:c"]);
    expect(deriveNotifications(items, NOW).map((n) => n.id).sort()).toEqual(ids);
  });

  it("breaks ties by name", () => {
    const out = deriveNotifications([item("1", at(2), { name: "Telur" }), item("2", at(2), { name: "Bayam" })], NOW);
    expect(out.map((n) => n.name)).toEqual(["Bayam", "Telur"]);
  });

  it("selects exactly the items isUrgent() flags (real clock)", () => {
    const real = new Date();
    const offsets = [-10, -1, 0, 1, 2, 3, 4, 5, 30];
    const items = [
      ...offsets.map((n) => item(`d${n}`, at(n, real))),
      item("bad", "2025-13-40"),
      item("empty", ""),
    ];
    const expected = items.filter((i) => isUrgent(i.expiresOn)).map((i) => i.id).sort();
    const actual = deriveNotifications(items).map((n) => n.itemId).sort();
    expect(actual).toEqual(expected);
  });
});

describe("groupNotifications", () => {
  it("groups in order, merges today + soon, and omits empty groups", () => {
    const list = deriveNotifications(
      [item("e", at(-1)), item("t", at(0)), item("s", at(2)), item("i", "")],
      NOW,
    );
    const groups = groupNotifications(list);
    expect(groups.map((g) => g.label)).toEqual(["Sudah kedaluwarsa", "Segera kedaluwarsa", "Perlu dicek tanggalnya"]);
    expect(groups[1]!.items.map((n) => n.itemId)).toEqual(["t", "s"]);

    const onlySoon = groupNotifications(deriveNotifications([item("s", at(2))], NOW));
    expect(onlySoon.map((g) => g.key)).toEqual(["soon"]);
    expect(groupNotifications([])).toEqual([]);
  });
});
