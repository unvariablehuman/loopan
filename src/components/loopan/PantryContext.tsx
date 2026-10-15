import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { makeSeed, type PantryItem } from "@/lib/pantry-data";

const KEY = "loopan.pantry.v1";

interface UsedEntry { id: string; name: string; price?: number; usedAt: string }
interface Stored { items: PantryItem[]; used: UsedEntry[] }

export type EditorState = null | { mode: "add"; hint?: "barcode" | "expiry" } | { mode: "edit"; item: PantryItem };

interface Ctx {
  ready: boolean;
  items: PantryItem[];
  usedThisWeek: UsedEntry[];
  addItem: (p: Omit<PantryItem, "id" | "addedAt">) => void;
  updateItem: (id: string, p: Omit<PantryItem, "id" | "addedAt">) => void;
  deleteItem: (id: string) => void;
  markUsed: (id: string) => void;
  editor: EditorState;
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
      toast.success(`${it.name} marked as used`);
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
        usedThisWeek,
        editor,
        openEditor,
        markUsed,
        addItem: (p) => {
          setState((s) => ({ ...s, items: [{ ...p, id: crypto.randomUUID(), addedAt: new Date().toISOString() }, ...s.items] }));
          toast.success(`${p.name} added to your pantry`);
        },
        updateItem: (id, p) => {
          setState((s) => ({ ...s, items: s.items.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
          toast.success(`${p.name} updated`);
        },
        deleteItem: (id) => {
          setState((s) => {
            const it = s.items.find((x) => x.id === id);
            if (it) toast(`${it.name} removed`);
            return { ...s, items: s.items.filter((x) => x.id !== id) };
          });
        },
        resetDemo: () => {
          setState({ items: makeSeed(), used: [] });
          toast("Sample pantry restored");
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
