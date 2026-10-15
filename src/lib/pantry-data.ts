import yogurt from "@/assets/yogurt.jpg";
import spinach from "@/assets/spinach.jpg";
import milk from "@/assets/milk.jpg";

export const CATEGORIES = ["Dairy", "Vegetables", "Fruits", "Grains", "Protein", "Pantry staples", "Frozen", "Other"] as const;
export const LOCATIONS = ["Fridge", "Freezer", "Pantry", "Counter"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Location = (typeof LOCATIONS)[number];
export type DateType = "use_by" | "best_before";

/** Stored shape — persisted to localStorage. Never stores status or days. */
export interface PantryItem {
  id: string;
  name: string;
  category: Category;
  quantity: string;
  location: Location;
  expiresOn: string; // YYYY-MM-DD
  dateType: DateType;
  price?: number | undefined;
  image?: string | undefined;
  brand?: string | undefined;
  barcode?: string | undefined;
  tone?: "coral" | "sage" | "mint" | undefined;
  addedAt: string;
}

export type Status = "past" | "today" | "soon" | "ok" | "invalid";

const DAY = 86_400_000;

export function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y = 0, m = 1, d = 1] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
}

export function toISODate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole days between today (local) and the stored date. null if invalid. */
export function daysLeft(expiresOn: string, now = new Date()): number | null {
  const d = parseDate(expiresOn);
  if (!d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / DAY);
}

export function statusOf(days: number | null): Status {
  if (days === null) return "invalid";
  if (days < 0) return "past";
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  return "ok";
}

export function statusLabel(days: number | null, dateType: DateType = "use_by"): string {
  const s = statusOf(days);
  if (s === "invalid") return "Check date";
  if (s === "past") return dateType === "best_before" ? "Past best-before" : "Past use-by";
  if (s === "today") return "Use today";
  if (s === "soon") return `Expiring soon · ${days}d`;
  return "Not urgent";
}

export const dateTypeLabel = (t: DateType) => (t === "use_by" ? "Use by" : "Best before");

export function formatDate(s: string) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "Invalid date";
}

/** Priority sort: invalid dates first (need fixing), then soonest. */
export function byPriority(a: PantryItem, b: PantryItem) {
  const da = daysLeft(a.expiresOn), db = daysLeft(b.expiresOn);
  if (da === null) return -1;
  if (db === null) return 1;
  return da - db;
}

/** First-run sample items, dated relative to today. Call lazily, never at module scope. */
export function makeSeed(): PantryItem[] {
  const now = new Date();
  const at = (n: number) => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
  const added = now.toISOString();
  const base = (o: Omit<PantryItem, "addedAt">): PantryItem => ({ ...o, addedAt: added });
  return [
    base({ id: "yogurt", name: "Yogurt", category: "Dairy", quantity: "1 tub", location: "Fridge", expiresOn: at(0), dateType: "use_by", price: 3.5, image: yogurt, tone: "coral" }),
    base({ id: "spinach", name: "Spinach", category: "Vegetables", quantity: "200 g", location: "Fridge", expiresOn: at(2), dateType: "best_before", price: 2.8, image: spinach, tone: "sage" }),
    base({ id: "milk", name: "Milk", category: "Dairy", quantity: "1 L", location: "Fridge", expiresOn: at(3), dateType: "use_by", price: 1.9, image: milk, tone: "mint" }),
    base({ id: "eggs", name: "Eggs", category: "Protein", quantity: "6 pcs", location: "Fridge", expiresOn: at(11), dateType: "best_before", price: 3.2 }),
    base({ id: "carrots", name: "Carrots", category: "Vegetables", quantity: "500 g", location: "Fridge", expiresOn: at(7), dateType: "best_before" }),
    base({ id: "bread", name: "Whole-grain bread", category: "Grains", quantity: "1 loaf", location: "Counter", expiresOn: at(4), dateType: "best_before", price: 2.5 }),
    base({ id: "rice", name: "Jasmine rice", category: "Pantry staples", quantity: "2 kg", location: "Pantry", expiresOn: at(140), dateType: "best_before" }),
  ];
}

// Illustrative chart data — no real activity history exists yet.
export const wasteData = [
  { label: "Vegetables", thisWeek: 9, lastWeek: 12 },
  { label: "Fruits", thisWeek: 5, lastWeek: 6 },
  { label: "Dairy", thisWeek: 3, lastWeek: 4 },
  { label: "Grains", thisWeek: 4, lastWeek: 4 },
  { label: "Protein", thisWeek: 2, lastWeek: 3 },
  { label: "Others", thisWeek: 2, lastWeek: 3 },
];
