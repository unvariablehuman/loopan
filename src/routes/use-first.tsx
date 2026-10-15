import { createFileRoute } from "@tanstack/react-router";
import { Hourglass } from "lucide-react";
import { usePantry } from "@/components/loopan/PantryContext";
import { EmptyState, ProductCard, SectionHead } from "@/components/loopan/Widgets";
import { byPriority } from "@/lib/pantry-data";

export const Route = createFileRoute("/use-first")({
  head: () => ({
    meta: [
      { title: "Use First — Loopan" },
      { name: "description", content: "Your pantry sorted by expiry, so you can use the right things first." },
      { property: "og:title", content: "Use First — Loopan" },
      { property: "og:description", content: "Your pantry sorted by expiry, so you can use the right things first." },
    ],
  }),
  component: UseFirst,
});

function UseFirst() {
  const { items, ready, openEditor } = usePantry();
  const list = [...items].sort(byPriority);
  return (
    <section className="card-surface p-5 sm:p-6">
      <SectionHead icon={Hourglass} title="Use first" sub="Everything in your pantry, soonest date first." />
      <div className="mt-5">
        {!ready ? <div className="h-64 animate-pulse rounded-xl bg-mint/60" /> : list.length === 0 ? (
          <EmptyState title="Nothing to use up" text="Your pantry is empty. Add items to see what to use first." action={
            <button onClick={() => openEditor({ mode: "add" })} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep">Add food item</button>
          } />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Dates are a guide only — always check food before eating.</p>
    </section>
  );
}
