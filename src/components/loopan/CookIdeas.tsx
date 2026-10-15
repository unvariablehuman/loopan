import { Link } from "@tanstack/react-router";
import { ArrowRight, ChefHat } from "lucide-react";
import type { PantryItem } from "@/lib/pantry-data";
import { rankRecipes } from "@/lib/recipe-match";
import { RECIPES } from "@/lib/recipes";
import { filterMatchesByPrefs } from "@/lib/recipe-prefs";
import { useRecipePrefs } from "@/hooks/use-recipe-prefs";

// A compact "Ide masak" strip shown under the Prioritas cards on Beranda. It reuses the Resep
// feature as-is: the same catalog, the same ranker (recipes that use an urgent ingredient come
// first) and the same recipe preferences from Pengaturan, so it always agrees with /cook.
// It is read-only: it only links to /cook and never touches the pantry. Matching is by
// ingredient NAME only, so the copy says which ingredients exist, never that there is "enough".
export function CookIdeas({ items, max = 2 }: { items: PantryItem[]; max?: number }) {
  const { selected } = useRecipePrefs();
  const usable = filterMatchesByPrefs(rankRecipes(RECIPES, items), selected).filter((m) => m.matched.length >= 1);
  const urgent = usable.filter((m) => m.usesUrgent); // rankRecipes already sorts these first
  const picks = (urgent.length > 0 ? urgent : usable).slice(0, max);
  const heading = urgent.length > 0 ? "Ide masak untuk bahan yang segera kedaluwarsa" : "Ide masak dari isi dapurmu";

  return (
    <section aria-label="Ide masak" className="mt-4 rounded-xl border bg-card/60 p-3">
      {picks.length === 0 ? (
        <Link to="/cook" className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-mint/60 hover:text-primary-deep">
          <span className="flex min-w-0 items-center gap-2">
            <ChefHat className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Belum ada resep yang cocok dengan isi dapurmu saat ini.</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-semibold text-primary">Lihat ide resep <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
        </Link>
      ) : (
        <>
          <h3 className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ChefHat className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {heading}
          </h3>
          <ul className="mt-2 grid gap-1">
            {picks.map((m) => (
              <li key={m.recipe.id}>
                <Link to="/cook" className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-mint/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{m.recipe.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {m.matched.length} dari {m.recipe.ingredients.length} bahan ada · {m.recipe.minutes} mnt
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
