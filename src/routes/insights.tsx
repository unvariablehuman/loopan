import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, Boxes, Wallet } from "lucide-react";
import { EmptyState, SectionHead } from "@/components/loopan/Widgets";
import { usePantry } from "@/components/loopan/PantryContext";
import { categoryLabel, formatPrice, isUrgent, type Category } from "@/lib/pantry-data";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Statistik — Loopan" },
      { name: "description", content: "Ringkasan isi dapur dan barang yang sudah kamu tandai terpakai." },
      { property: "og:title", content: "Statistik — Loopan" },
      { property: "og:description", content: "Ringkasan isi dapur dan barang yang sudah kamu tandai terpakai." },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { items, used, usedThisWeek, ready } = usePantry();

  // Pantry composition from real stored items — count per category.
  const byCategory = new Map<Category, number>();
  for (const i of items) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
  const composition = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = composition.reduce((m, [, n]) => Math.max(m, n), 0);

  // "Perlu segera digunakan" — shared isUrgent rule (missing/invalid date or within URGENT_DAYS).
  const atRisk = items.filter((i) => isUrgent(i.expiresOn)).length;
  // Estimasi nilai dapur — same reduce pattern PantryGlance uses; missing price counts as 0.
  const totalValue = items.reduce((s, i) => s + (i.price ?? 0), 0);

  const empty = items.length === 0 && used.length === 0;

  return (
    <div className="grid gap-4">
      <SectionHead icon={BarChart3} title="Statistik" sub="Ringkasan isi dapur dan barang yang sudah kamu tandai terpakai." />
      <section className="card-surface p-5 sm:p-6">
        {!ready ? (
          <div className="h-56 animate-pulse rounded-xl bg-mint/60" />
        ) : empty ? (
          <EmptyState
            title="Statistik akan muncul di sini"
            text="Tambahkan item ke dapur dan tandai yang sudah digunakan — ringkasannya akan terisi otomatis seiring aktivitasmu."
          />
        ) : (
          <div className="grid gap-5">
            {items.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl bg-mint p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-primary"><Boxes className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="text-lg font-bold">{items.length}</div>
                    <div className="text-xs text-muted-foreground">Barang di dapur</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-coral/50 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-coral-foreground"><AlertTriangle className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="text-lg font-bold">{atRisk}</div>
                    <div className="text-xs text-muted-foreground">Perlu segera digunakan</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-amber p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-amber-foreground"><Wallet className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="text-lg font-bold [overflow-wrap:anywhere]">{formatPrice(totalValue)}</div>
                    <div className="text-xs text-muted-foreground">Estimasi nilai dapur</div>
                  </div>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div>
                {/* Plain heading — no repeated chart icon; the page heading already carries it. */}
                <h2 className="text-[15px] font-semibold">Isi dapur per kategori</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Jumlah barang yang kamu simpan saat ini.</p>
                <div className="mt-4 flex items-end justify-between gap-2 border-b" style={{ height: "10rem" }} role="img" aria-label="Jumlah barang per kategori di dapurmu">
                  {composition.map(([cat, n]) => (
                    <div key={cat} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${categoryLabel(cat)}: ${n}`}>
                      <span className="text-[11px] font-semibold text-foreground/80">{n}</span>
                      <div className="w-5 rounded-t-md bg-primary sm:w-7" style={{ height: maxCount > 0 ? `${(n / maxCount) * 100}%` : "0%" }} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between gap-2">
                  {composition.map(([cat]) => (
                    <span key={cat} className="flex-1 truncate text-center text-[11px] text-muted-foreground">{categoryLabel(cat)}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              {/* Plain heading — section icon dropped to reduce repetition. */}
              <h2 className="text-[15px] font-semibold">Barang yang kamu tandai terpakai</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Dihitung dari aktivitas yang kamu catat sendiri.</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-mint p-4">
                  <dt className="text-xs text-muted-foreground">Ditandai terpakai (7 hari terakhir)</dt>
                  <dd className="mt-1 text-lg font-bold">{usedThisWeek.length} barang</dd>
                </div>
                <div className="rounded-xl bg-mint p-4">
                  <dt className="text-xs text-muted-foreground">Total ditandai terpakai</dt>
                  <dd className="mt-1 text-lg font-bold">{used.length} barang</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
