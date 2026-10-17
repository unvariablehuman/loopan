import { createFileRoute } from "@tanstack/react-router";
import { Hourglass } from "lucide-react";
import { usePantry } from "@/components/loopan/PantryContext";
import { EmptyState, ProductCard, SectionHead } from "@/components/loopan/Widgets";
import { byPriority, isUrgent } from "@/lib/pantry-data";

export const Route = createFileRoute("/use-first")({
  head: () => ({
    meta: [
      { title: "Prioritas Penggunaan — Loopan" },
      { name: "description", content: "Dapurmu diurutkan berdasarkan kedaluwarsa, agar kamu memakai yang tepat lebih dulu." },
      { property: "og:title", content: "Prioritas Penggunaan — Loopan" },
      { property: "og:description", content: "Dapurmu diurutkan berdasarkan kedaluwarsa, agar kamu memakai yang tepat lebih dulu." },
    ],
  }),
  component: UseFirst,
});

function UseFirst() {
  const { items, ready, openEditor } = usePantry();
  // Split the pantry using the single shared urgency rule (isUrgent in lib/pantry-data):
  // missing/invalid dates or <= URGENT_DAYS count as urgent, so this page and the Overview
  // teaser always agree. Both groups keep byPriority (null-date-first) ordering.
  const urgent = items.filter((i) => isUrgent(i.expiresOn)).sort(byPriority);
  const rest = items.filter((i) => !isUrgent(i.expiresOn)).sort(byPriority);
  return (
    <section className="card-surface p-5 sm:p-6">
      <SectionHead icon={Hourglass} title="Prioritas Penggunaan" />
      <div className="mt-5">
        {!ready ? <div className="h-64 animate-pulse rounded-xl bg-mint/60" /> : items.length === 0 ? (
          <EmptyState title="Tidak ada yang perlu dihabiskan" text="Dapurmu masih kosong. Tambahkan barang untuk melihat prioritasnya." action={
            <button onClick={() => openEditor({ mode: "add" })} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep">Tambahkan ke Dapur</button>
          } />
        ) : (
          <div className="grid gap-6">
            {urgent.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{urgent.map((p) => <ProductCard key={p.id} p={p} />)}</div>
            ) : (
              <EmptyState title="Belum ada yang mendesak" text="Tidak ada barang yang akan kedaluwarsa dalam beberapa hari. Semua di bawah masih segar." />
            )}
            {rest.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Belum mendesak</p>
                <div className="grid gap-4 opacity-80 sm:grid-cols-2 xl:grid-cols-3">{rest.map((p) => <ProductCard key={p.id} p={p} />)}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Tanggal hanya panduan — selalu periksa makanan sebelum dikonsumsi.</p>
    </section>
  );
}
