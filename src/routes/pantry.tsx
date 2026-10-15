import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Package, Plus } from "lucide-react";
import { usePantry } from "@/components/loopan/PantryContext";
import { DemoTag, SectionHead, StatusBadge } from "@/components/loopan/Widgets";

export const Route = createFileRoute("/pantry")({
  head: () => ({
    meta: [
      { title: "My Pantry — Loopan" },
      { name: "description", content: "Everything in your pantry, sorted by category and expiry." },
      { property: "og:title", content: "My Pantry — Loopan" },
      { property: "og:description", content: "Everything in your pantry, sorted by category and expiry." },
    ],
  }),
  component: Pantry,
});

function Pantry() {
  const { items, markUsed, setScanMode } = usePantry();
  const cats = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const [cat, setCat] = useState("All");
  const list = items.filter((i) => cat === "All" || i.category === cat);
  return (
    <section className="card-surface p-5 sm:p-6">
      <SectionHead icon={Package} title="My Pantry" sub={`${items.length} items tracked`} action={
        <button onClick={() => setScanMode("barcode")} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep"><Plus className="h-4 w-4" />Add item</button>
      } />
      <div className="mt-5 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${cat === c ? "bg-primary text-primary-foreground" : "bg-mint text-foreground/80 hover:bg-sage"}`}>{c}</button>
        ))}
      </div>
      <ul className="mt-5 divide-y">
        {list.map((p) => (
          <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{p.name} <span className="font-normal text-muted-foreground">· {p.quantity}</span></div>
              <div className="text-xs text-muted-foreground">{p.category} · Exp. {p.expires}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge days={p.daysLeft} />
              <button onClick={() => markUsed(p.id)} aria-label={`Mark ${p.name} as used`} className="grid h-8 w-8 place-items-center rounded-full border text-primary hover:bg-mint"><Check className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4"><DemoTag /></div>
    </section>
  );
}
