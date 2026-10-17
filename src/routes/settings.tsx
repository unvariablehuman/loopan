import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings } from "lucide-react";
import { SectionHead } from "@/components/loopan/Widgets";
import { URGENT_DAYS } from "@/lib/pantry-data";
import { RECIPE_PREFS } from "@/lib/recipe-prefs";
import { useRecipePrefs } from "@/hooks/use-recipe-prefs";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan — Loopan" },
      { name: "description", content: "Atur pengingat dan preferensi resep di Loopan." },
      { property: "og:title", content: "Pengaturan — Loopan" },
      { property: "og:description", content: "Atur pengingat dan preferensi resep di Loopan." },
    ],
  }),
  component: SettingsPage,
});

const opts = [
  { id: "daily", label: "Ringkasan prioritas harian", desc: "Daftar pagi berisi barang yang perlu segera dipakai." },
  { id: "expiry", label: "Pengingat kedaluwarsa", desc: `Peringatan ${URGENT_DAYS} hari sebelum sesuatu kedaluwarsa.` },
];

function SettingsPage() {
  const [on, setOn] = useState<Record<string, boolean>>({ daily: true, expiry: true });
  const { selected, toggle, clear } = useRecipePrefs();
  const [error, setError] = useState<string | null>(null);
  const handle = (res: { ok: true } | { ok: false; error: string }) => setError(res.ok ? null : res.error);
  return (
    <section className="card-surface max-w-2xl p-5 sm:p-6">
      <SectionHead icon={Settings} title="Pengaturan" />
      <ul className="mt-5 divide-y">
        {opts.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.desc}</div>
            </div>
            <button role="switch" aria-checked={on[o.id]} aria-label={o.label} onClick={() => setOn((s) => ({ ...s, [o.id]: !s[o.id] }))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${on[o.id] ? "bg-primary" : "bg-sage"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-soft transition-all ${on[o.id] ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </li>
        ))}
        <li className="py-4">
          <fieldset aria-describedby="recipe-prefs-desc" className="min-w-0">
            <legend className="text-sm font-semibold">Preferensi resep</legend>
            <p id="recipe-prefs-desc" className="text-xs text-muted-foreground">Pilih agar halaman Resep hanya menampilkan resep yang sesuai. Tanpa pilihan, semua resep tampil. Berdasarkan daftar bahan dan waktu masak, bukan klaim gizi.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {RECIPE_PREFS.map((p) => {
                const checked = selected.includes(p.id);
                return (
                  <label key={p.id} className={`flex min-w-0 cursor-pointer flex-col rounded-lg border px-3 py-2 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${checked ? "border-primary bg-mint text-primary-deep" : "hover:bg-muted"}`}>
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => handle(toggle(p.id))} aria-labelledby={`pref-${p.id}-label`} aria-describedby={`pref-${p.id}-rule`} />
                    <span id={`pref-${p.id}-label`} className="text-[13px] font-semibold">{p.label}</span>
                    <span id={`pref-${p.id}-rule`} className="block text-[11px] text-muted-foreground">{p.rule}</span>
                  </label>
                );
              })}
            </div>
            {selected.length > 0 && (
              <button type="button" onClick={() => handle(clear())} className="mt-3 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hapus pilihan</button>
            )}
            {error && <p role="alert" className="mt-2 text-xs text-coral-foreground">{error}</p>}
          </fieldset>
        </li>
      </ul>
    </section>
  );
}
