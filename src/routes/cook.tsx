import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChefHat, Clock, Leaf, Sparkles } from "lucide-react";
import { usePantry } from "@/components/loopan/PantryContext";
import { EmptyState, SectionHead } from "@/components/loopan/Widgets";
import { RecipeDialog } from "@/components/loopan/RecipeDialog";
import { matchRecipe, rankRecipes, type RecipeMatch } from "@/lib/recipe-match";
import { RECIPES, type Recipe } from "@/lib/recipes";
import { RECIPE_PREFS, filterMatchesByPrefs } from "@/lib/recipe-prefs";
import { useRecipePrefs } from "@/hooks/use-recipe-prefs";

export const Route = createFileRoute("/cook")({
  head: () => ({
    meta: [
      { title: "Masak dengan Loopan — Loopan" },
      { name: "description", content: "Saran resep sederhana berdasarkan bahan yang ada di dapurmu, mengutamakan bahan yang segera kedaluwarsa." },
      { property: "og:title", content: "Masak dengan Loopan — Loopan" },
      { property: "og:description", content: "Saran resep sederhana berdasarkan bahan yang ada di dapurmu, mengutamakan bahan yang segera kedaluwarsa." },
    ],
  }),
  component: Cook,
});

// Presentational recipe card in the Loopan ProductCard visual style (card-surface / rounded-2xl /
// tone backgrounds). It takes a RecipeMatch and an onOpen callback and calls NO pantry mutator.
function RecipeCard({ match, onOpen }: { match: RecipeMatch; onOpen: () => void }) {
  const { recipe, matched, usesUrgent } = match;
  const total = recipe.ingredients.length;
  const hint = matched.slice(0, 3).join(", ");
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-sage/70 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold"><ChefHat className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0">{recipe.title}</span></h3>
          <span className="whitespace-nowrap rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-primary-deep">{matched.length}/{total} bahan</span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 pl-6 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {recipe.minutes} mnt{recipe.servings != null && ` · ${recipe.servings} porsi`}</p>
        {hint && <p className="mt-3 flex items-start gap-1.5 text-[13px] text-foreground/80"><Leaf className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="capitalize">{hint}</span></p>}
        {usesUrgent && (
          <span className="mt-3 inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-amber px-2.5 py-1 text-xs font-semibold text-amber-foreground">
            <Sparkles className="h-3.5 w-3.5" /> pakai bahan segera kedaluwarsa
          </span>
        )}
        <button onClick={onOpen} className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-card/70 py-2 text-[13px] font-semibold text-primary-deep transition hover:bg-card">
          Lihat resep
        </button>
      </div>
    </article>
  );
}

// Lower-priority card for recipes with zero matched ingredients ("Inspirasi lainnya").
function InspirationCard({ match, onOpen }: { match: RecipeMatch; onOpen: () => void }) {
  const { recipe } = match;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex flex-1 flex-col p-4">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold"><ChefHat className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0">{recipe.title}</span></h3>
        <p className="mt-1 flex items-center gap-1.5 pl-6 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {recipe.minutes} mnt{recipe.servings != null && ` · ${recipe.servings} porsi`}</p>
        <p className="mt-3 text-[13px] text-foreground/80">Bahan yang dibutuhkan: <span className="capitalize">{recipe.ingredients.join(", ")}</span>.</p>
        <button onClick={onOpen} className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-muted py-2 text-[13px] font-semibold text-primary-deep transition hover:bg-mint">
          Lihat resep
        </button>
      </div>
    </article>
  );
}

function Cook() {
  const { items, ready, openEditor } = usePantry();
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);

  const { selected, clear } = useRecipePrefs();

  // Preferences filter the RANKED list (AND semantics); ranking itself is unchanged.
  const rankedAll = rankRecipes(RECIPES, items);
  const ranked = filterMatchesByPrefs(rankedAll, selected);
  const main = ranked.filter((m) => m.matched.length >= 1);
  const inspiration = ranked.filter((m) => m.matched.length === 0);
  const hadMain = rankedAll.some((m) => m.matched.length >= 1);
  const filtering = selected.length > 0;
  // Pantry is non-empty in the branch that uses this, and unfiltered every recipe lands in one list.
  const noPrefMatch = filtering && main.length === 0 && inspiration.length === 0;

  return (
    <section className="card-surface p-5 sm:p-6">
      <SectionHead icon={ChefHat} title="Masak dengan Loopan" sub="Resep yang bisa kamu masak dari isi dapurmu — yang memakai bahan segera kedaluwarsa muncul lebih dulu." />
      <div className="mt-5">
        {!ready ? (
          <div className="h-64 animate-pulse rounded-xl bg-mint/60" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Belum ada bahan untuk disarankan"
            text="Dapurmu masih kosong. Tambahkan bahan untuk melihat resep yang bisa kamu masak."
            action={
              <button onClick={() => openEditor({ mode: "add" })} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep">Tambahkan ke Dapur</button>
            }
          />
        ) : (
          <div className="grid gap-6">
            {filtering && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Preferensi:</span>
                {RECIPE_PREFS.filter((p) => selected.includes(p.id)).map((p) => (
                  <span key={p.id} className="rounded-full bg-mint px-2.5 py-1 font-semibold text-primary-deep">{p.label}</span>
                ))}
                <Link to="/settings" aria-label="Ubah preferensi resep" className="font-semibold text-primary hover:underline">Ubah</Link>
              </div>
            )}

            {noPrefMatch ? (
              <EmptyState
                title="Belum ada resep yang cocok dengan preferensimu"
                text="Tidak ada resep yang memenuhi semua pilihanmu. Ubah preferensi atau tampilkan semua resep."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link to="/settings" className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep">Ubah preferensi</Link>
                    <button type="button" onClick={() => clear()} className="rounded-full border border-primary/40 px-4 py-2 text-[13px] font-semibold text-primary-deep hover:bg-mint">Tampilkan semua resep</button>
                  </div>
                }
              />
            ) : (
              <>
                {main.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {main.map((m) => <RecipeCard key={m.recipe.id} match={m} onOpen={() => setOpenRecipe(m.recipe)} />)}
                  </div>
                ) : (
                  <EmptyState
                    title="Belum ada resep yang cocok"
                    text={filtering && hadMain
                      ? "Tidak ada resep dari bahan di dapurmu yang cocok dengan preferensimu. Lihat inspirasi di bawah atau ubah preferensi."
                      : "Bahan di dapurmu belum cocok dengan resep yang tersedia. Lihat inspirasi di bawah atau tambahkan bahan lain."}
                  />
                )}

                {inspiration.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspirasi lainnya</p>
                    <div className="grid gap-4 opacity-80 sm:grid-cols-2 xl:grid-cols-3">
                      {inspiration.map((m) => <InspirationCard key={m.recipe.id} match={m} onOpen={() => setOpenRecipe(m.recipe)} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Saran berdasarkan nama bahan di dapurmu, bukan jumlahnya. Tanggal hanya panduan — selalu periksa makanan sebelum dikonsumsi.</p>

      <RecipeDialog match={openRecipe ? matchRecipe(openRecipe, items) : null} onClose={() => setOpenRecipe(null)} />
    </section>
  );
}
