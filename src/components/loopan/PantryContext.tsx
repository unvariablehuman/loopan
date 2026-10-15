import { createContext, useContext, useState, type ReactNode } from "react";
import { products as seed, type Product } from "@/lib/pantry-data";

interface Ctx {
  items: Product[];
  used: number;
  markUsed: (id: string) => void;
  addItem: (p: Product) => void;
  scanMode: null | "barcode" | "expiry";
  setScanMode: (m: null | "barcode" | "expiry") => void;
}

const PantryCtx = createContext<Ctx | null>(null);

export function PantryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>(seed);
  const [used, setUsed] = useState(3);
  const [scanMode, setScanMode] = useState<Ctx["scanMode"]>(null);
  return (
    <PantryCtx.Provider
      value={{
        items,
        used,
        scanMode,
        setScanMode,
        markUsed: (id) => {
          setItems((xs) => xs.filter((x) => x.id !== id));
          setUsed((u) => u + 1);
        },
        addItem: (p) => setItems((xs) => [p, ...xs]),
      }}
    >
      {children}
    </PantryCtx.Provider>
  );
}

export function usePantry() {
  const c = useContext(PantryCtx);
  if (!c) throw new Error("usePantry outside provider");
  return c;
}
