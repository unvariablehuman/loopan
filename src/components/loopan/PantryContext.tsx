import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { makeSeed, type PantryItem } from "@/lib/pantry-data";

// v2: bumped so first load ignores older demo data (which lacked seed images) and re-seeds
// from makeSeed(). Users with their own saved items under v1 start fresh once; this is demo data.
const KEY = "loopan.pantry.v2";

export interface UsedEntry { id: string; name: string; price?: number | undefined; usedAt: string }
interface Stored { items: PantryItem[]; used: UsedEntry[] }

export interface Prefill {
  name?: string | undefined; brand?: string | undefined; barcode?: string | undefined; image?: string | undefined; category?: PantryItem["category"] | undefined;
  expiresOn?: string; dateType?: PantryItem["dateType"];
  /** Shown above the form, e.g. "Product not found". */
  notice?: { tone: "info" | "warn"; text: string };
}
export type EditorState = null | { mode: "add"; prefill?: Prefill } | { mode: "edit"; item: PantryItem };
export type ScannerKind = null | "barcode" | "expiry";

interface Ctx {
  ready: boolean;
  items: PantryItem[];
  used: UsedEntry[];
  usedThisWeek: UsedEntry[];
  addItem: (p: Omit<PantryItem, "id" | "addedAt">) => void;
  updateItem: (id: string, p: Omit<PantryItem, "id" | "addedAt">) => void;
  deleteItem: (id: string) => void;
  markUsed: (id: string) => void;
  editor: EditorState;
  scanner: ScannerKind;
  openScanner: (k: ScannerKind) => void;
  openEditor: (s: EditorState) => void;
  resetDemo: () => void;
}

const PantryCtx = createContext<Ctx | null>(null);

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (!Array.isArray(s.items)) return null;
    return { items: s.items.filter((i) => i && typeof i.id === "string" && typeof i.name === "string"), used: Array.isArray(s.used) ? s.used : [] };
  } catch {
    return null;
  }
}

export function PantryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>({ items: [], used: [] });
  const [ready, setReady] = useState(false);
  const [editor, openEditor] = useState<EditorState>(null);
  const [scanner, openScanner] = useState<ScannerKind>(null);

  useEffect(() => {
    setState(load() ?? { items: makeSeed(), used: [] });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const markUsed = useCallback((id: string) => {
    setState((s) => {
      const it = s.items.find((x) => x.id === id);
      if (!it) return s;
      toast.success(`${it.name} ditandai sudah digunakan`);
      return { items: s.items.filter((x) => x.id !== id), used: [...s.used, { id, name: it.name, price: it.price, usedAt: new Date().toISOString() }] };
    });
  }, []);

  const weekAgo = Date.now() - 7 * 86_400_000;
  const usedThisWeek = state.used.filter((u) => new Date(u.usedAt).getTime() >= weekAgo);

  return (
    <PantryCtx.Provider
      value={{
        ready,
        items: state.items,
        used: state.used,
        usedThisWeek,
        editor,
        scanner,
        openScanner,
        openEditor,
        markUsed,
        addItem: (p) => {
          setState((s) => ({ ...s, items: [{ ...p, id: crypto.randomUUID(), addedAt: new Date().toISOString() }, ...s.items] }));
          toast.success(`${p.name} ditambahkan ke dapur`);
        },
        updateItem: (id, p) => {
          setState((s) => ({ ...s, items: s.items.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
          toast.success(`${p.name} diperbarui`);
        },
        deleteItem: (id) => {
          setState((s) => {
            const it = s.items.find((x) => x.id === id);
            if (it) toast(`${it.name} dihapus`);
            return { ...s, items: s.items.filter((x) => x.id !== id) };
          });
        },
        resetDemo: () => {
          setState({ items: makeSeed(), used: [] });
          toast("Contoh isi dapur dipulihkan");
        },
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
