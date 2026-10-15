import type { Category } from "./pantry-data";

export interface OffProduct { name?: string; brand?: string; image?: string; category?: Category }
export type OffResult = { status: "found"; product: OffProduct } | { status: "not_found" } | { status: "error"; message: string };

const CAT_RULES: [RegExp, Category][] = [
  [/frozen/, "Frozen"],
  [/dair|milk|yogurt|yoghurt|cheese|butter|cream/, "Dairy"],
  [/vegetable|salad|legume/, "Vegetables"],
  [/fruit|berr|juice/, "Fruits"],
  [/cereal|bread|pasta|rice|grain|bakery/, "Grains"],
  [/meat|fish|seafood|egg|poultry|tofu|chicken/, "Protein"],
  [/snack|sauce|condiment|spread|canned|oil|spice|sweet|biscuit|beverage|drink/, "Pantry staples"],
];

/** Looks up a barcode in the public Open Food Facts database. Never invents data. */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<OffResult> {
  if (!/^\d{6,14}$/.test(code)) return { status: "not_found" };
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_en,brands,image_front_small_url,image_url,categories_tags`,
      { signal },
    );
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error", message: `Lookup failed (${res.status})` };
    const j = (await res.json()) as { status?: number; product?: Record<string, unknown> };
    if (j.status !== 1 || !j.product) return { status: "not_found" };
    const p = j.product;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const tags = Array.isArray(p.categories_tags) ? (p.categories_tags as string[]).join(" ") : "";
    const category = CAT_RULES.find(([re]) => re.test(tags))?.[1];
    const product: OffProduct = {
      name: str(p.product_name) ?? str(p.product_name_en),
      brand: str(p.brands)?.split(",")[0]?.trim(),
      image: str(p.image_front_small_url) ?? str(p.image_url),
      category,
    };
    if (!product.name && !product.brand) return { status: "not_found" };
    return { status: "found", product };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return { status: "error", message: "Couldn’t reach Open Food Facts. Check your connection." };
  }
}
