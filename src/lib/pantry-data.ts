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
  if (s === "invalid") return "Periksa tanggal";
  if (s === "past") return dateType === "best_before" ? "Lewat tanggal terbaik" : "Lewat tanggal pakai";
  if (s === "today") return "Gunakan hari ini";
  if (s === "soon") return `Segera gunakan · ${days} hr`;
  return "Belum mendesak";
}

export const dateTypeLabel = (t: DateType) => (t === "use_by" ? "Tanggal pakai" : "Baik sebelum");

export function formatDate(s: string) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("id-ID", { month: "short", day: "2-digit", year: "numeric" }) : "Tanggal tidak valid";
}

// Centralized Rupiah formatter — single source of truth for every price display.
// Stored price numbers are treated as whole Rupiah and rendered AS-IS (no rescaling):
// any pre-existing decimal demo values simply round, and this never throws on decimals.
// Renders "Rp" (not "$") via the id-ID / IDR locale.
export function formatPrice(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// Shared urgency rule — the single source for "segera gunakan" grouping and counts.
// Missing/invalid dates count as urgent (they need attention). Default threshold 3 days.
export const URGENT_DAYS = 3;
export function isUrgent(expiresOn: string): boolean {
  const d = daysLeft(expiresOn);
  return d === null || d <= URGENT_DAYS;
}

// DISPLAY-ONLY label maps. The stored canonical category/location VALUES stay English
// (used by makeSeed, equality checks, filtering in pantry.tsx, and the ItemEditor <select>
// values), so persistence and comparisons keep working unchanged. These maps only control
// what the user SEES in the UI — never store or compare against the Indonesian strings.
export const CATEGORY_LABELS: Record<Category, string> = {
  Dairy: "Produk Susu",
  Vegetables: "Sayuran",
  Fruits: "Buah",
  Grains: "Biji-bijian",
  Protein: "Protein",
  "Pantry staples": "Kebutuhan Pokok",
  Frozen: "Beku",
  Other: "Lainnya",
};
export const LOCATION_LABELS: Record<Location, string> = {
  Fridge: "Kulkas",
  Freezer: "Freezer",
  Pantry: "Lemari Dapur",
  Counter: "Meja Dapur",
};
export const categoryLabel = (c: Category) => CATEGORY_LABELS[c] ?? c;
export const locationLabel = (l: Location) => LOCATION_LABELS[l] ?? l;

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
    // Demo-only names/prices in Indonesian whole-Rupiah; only used when localStorage is empty or on resetDemo.
    base({ id: "yogurt", name: "Yoghurt", category: "Dairy", quantity: "1 tub", location: "Fridge", expiresOn: at(0), dateType: "use_by", price: 18000, image: yogurt, tone: "coral" }),
    base({ id: "spinach", name: "Bayam", category: "Vegetables", quantity: "200 g", location: "Fridge", expiresOn: at(2), dateType: "best_before", price: 12000, image: spinach, tone: "sage" }),
    base({ id: "milk", name: "Susu", category: "Dairy", quantity: "1 L", location: "Fridge", expiresOn: at(3), dateType: "use_by", price: 20000, image: milk, tone: "mint" }),
    base({ id: "eggs", name: "Telur", category: "Protein", quantity: "6 pcs", location: "Fridge", expiresOn: at(11), dateType: "best_before", price: 28000 }),
    base({ id: "carrots", name: "Wortel", category: "Vegetables", quantity: "500 g", location: "Fridge", expiresOn: at(7), dateType: "best_before", price: 10000 }),
    base({ id: "bread", name: "Roti gandum utuh", category: "Grains", quantity: "1 loaf", location: "Counter", expiresOn: at(4), dateType: "best_before", price: 22000 }),
    base({ id: "rice", name: "Beras melati", category: "Pantry staples", quantity: "2 kg", location: "Pantry", expiresOn: at(140), dateType: "best_before", price: 75000 }),
  ];
}
