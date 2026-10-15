import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Check, MapPin, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { usePantry } from "@/components/loopan/PantryContext";
import { EmptyState, SectionHead, StatusBadge } from "@/components/loopan/Widgets";
import { byPriority, categoryLabel, CATEGORIES, dateTypeLabel, formatDate, formatPrice, locationLabel, type Category } from "@/lib/pantry-data";

export const Route = createFileRoute("/pantry")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Dapur Saya — Loopan" },
      { name: "description", content: "Tambah, ubah, dan lacak semua isi dapurmu, diurutkan berdasarkan kedaluwarsa." },
      { property: "og:title", content: "Dapur Saya — Loopan" },
      { property: "og:description", content: "Tambah, ubah, dan lacak semua isi dapurmu, diurutkan berdasarkan kedaluwarsa." },
    ],
  }),
  component: Pantry,
});

function Pantry() {
  const { items, ready, markUsed, deleteItem, openEditor, resetDemo } = usePantry();
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/pantry" });
  const [cat, setCat] = useState<string>("All");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const query = q.trim().toLowerCase();
  const list = items
    .filter((i) => (cat === "All" || i.category === cat) && (!query || `${i.name} ${i.category} ${i.location}`.toLowerCase().includes(query)))
    .sort(byPriority);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, items.filter((i) => i.category === c).length]));

  return (
    <section className="card-surface p-5 sm:p-6">
      <SectionHead icon={Package} title="Dapur Saya" sub={ready ? `${items.length} barang terlacak` : "Memuat…"} action={
        <button onClick={() => openEditor({ mode: "add" })} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep"><Plus className="h-4 w-4" />Tambah item</button>
      } />

      <div className="relative mt-5 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => navigate({ search: { q: e.target.value || undefined }, replace: true })}
          placeholder="Cari dapurmu"
          aria-label="Cari dapurmu"
          className="h-10 w-full rounded-full border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["All", ...CATEGORIES.filter((c) => (counts[c] ?? 0) > 0)].map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${cat === c ? "bg-primary text-primary-foreground" : "bg-mint text-foreground/80 hover:bg-sage"}`}>
            {c === "All" ? "Semua" : categoryLabel(c as Category)} <span className="opacity-70">{c === "All" ? items.length : counts[c]}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {!ready ? (
          <div className="h-48 animate-pulse rounded-xl bg-mint/60" />
        ) : items.length === 0 ? (
          <EmptyState title="Dapurmu masih kosong" text="Tambahkan makanan pertamamu untuk mulai melacak tanggal." action={
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => openEditor({ mode: "add" })} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep">Tambahkan ke Dapur</button>
              <button onClick={resetDemo} className="rounded-full border px-4 py-2 text-[13px] font-semibold hover:bg-muted">Muat contoh barang</button>
            </div>
          } />
        ) : list.length === 0 ? (
          <EmptyState title="Tidak ada barang yang cocok" text="Coba pencarian atau kategori lain." action={
            <button onClick={() => { setCat("All"); navigate({ search: {}, replace: true }); }} className="rounded-full border px-4 py-2 text-[13px] font-semibold hover:bg-muted">Hapus filter</button>
          } />
        ) : (
          <ul className="divide-y">
            {list.map((p) => (
              <li key={p.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    <StatusBadge item={p} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{categoryLabel(p.category)} · {p.quantity}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locationLabel(p.location)}</span>
                    <span>{dateTypeLabel(p.dateType)} {formatDate(p.expiresOn)}</span>
                    {p.price != null && <span>{formatPrice(p.price)}</span>}
                  </div>
                </div>
                {confirmId === p.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">Hapus {p.name}?</span>
                    <button onClick={() => { deleteItem(p.id); setConfirmId(null); }} className="rounded-full bg-coral-foreground px-3 py-1.5 font-semibold text-primary-foreground">Hapus</button>
                    <button onClick={() => setConfirmId(null)} className="rounded-full border px-3 py-1.5 font-semibold hover:bg-muted">Batal</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => markUsed(p.id)} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-mint"><Check className="h-3.5 w-3.5" />Digunakan</button>
                    <button onClick={() => openEditor({ mode: "edit", item: p })} aria-label={`Ubah ${p.name}`} className="grid h-8 w-8 place-items-center rounded-full border hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setConfirmId(p.id)} aria-label={`Hapus ${p.name}`} className="grid h-8 w-8 place-items-center rounded-full border text-coral-foreground hover:bg-coral/50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Hanya disimpan di browser ini. Tanggal hanya panduan — selalu periksa makanan sebelum dikonsumsi.</p>
    </section>
  );
}
