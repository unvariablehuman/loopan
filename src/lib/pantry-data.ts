import yogurt from "@/assets/yogurt.jpg";
import spinach from "@/assets/spinach.jpg";
import milk from "@/assets/milk.jpg";

export type Status = "today" | "soon" | "ok";

export interface Product {
  id: string;
  name: string;
  category: string;
  expires: string;
  daysLeft: number;
  quantity: string;
  image?: string;
  tone?: "coral" | "sage" | "mint";
}

// Demo data only — illustrative values, not real tracking.
export const products: Product[] = [
  { id: "yogurt", name: "Yogurt", category: "Dairy", expires: "Oct 15, 2026", daysLeft: 0, quantity: "1 tub", image: yogurt, tone: "coral" },
  { id: "spinach", name: "Spinach", category: "Vegetables", expires: "Oct 17, 2026", daysLeft: 2, quantity: "200 g", image: spinach, tone: "sage" },
  { id: "milk", name: "Milk", category: "Dairy", expires: "Oct 18, 2026", daysLeft: 3, quantity: "1 L", image: milk, tone: "mint" },
  { id: "eggs", name: "Eggs", category: "Protein", expires: "Oct 26, 2026", daysLeft: 11, quantity: "6 pcs" },
  { id: "carrots", name: "Carrots", category: "Vegetables", expires: "Oct 22, 2026", daysLeft: 7, quantity: "500 g" },
  { id: "bread", name: "Whole-grain bread", category: "Grains", expires: "Oct 19, 2026", daysLeft: 4, quantity: "1 loaf" },
  { id: "apples", name: "Apples", category: "Fruits", expires: "Oct 29, 2026", daysLeft: 14, quantity: "4 pcs" },
  { id: "rice", name: "Jasmine rice", category: "Grains", expires: "Mar 02, 2027", daysLeft: 138, quantity: "2 kg" },
  { id: "chicken", name: "Chicken breast", category: "Protein", expires: "Oct 17, 2026", daysLeft: 2, quantity: "400 g" },
  { id: "cheese", name: "Cheddar cheese", category: "Dairy", expires: "Nov 05, 2026", daysLeft: 21, quantity: "250 g" },
];

export const statusOf = (d: number): Status => (d <= 0 ? "today" : d <= 4 ? "soon" : "ok");
export const statusLabel = (d: number) =>
  d <= 0 ? "Use today" : d === 1 ? "1 day left" : `${d} days left`;

export const wasteData = [
  { label: "Vegetables", thisWeek: 9, lastWeek: 12 },
  { label: "Fruits", thisWeek: 5, lastWeek: 6 },
  { label: "Dairy", thisWeek: 3, lastWeek: 4 },
  { label: "Grains", thisWeek: 4, lastWeek: 4 },
  { label: "Protein", thisWeek: 2, lastWeek: 3 },
  { label: "Others", thisWeek: 2, lastWeek: 3 },
];
