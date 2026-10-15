import { useEffect } from "react";
import { Check, ChefHat, Clock, Minus, Users, X } from "lucide-react";
import { type RecipeMatch } from "@/lib/recipe-match";

// Recipe-detail overlay. Follows the fixed-overlay pattern from ItemEditor/BarcodeScanner
// (fixed inset-0 … role="dialog" aria-modal, backdrop close + panel stopPropagation, close
// button) and adds its own Esc-to-close listener. It is PRESENTATIONAL only: it receives an
// already-computed RecipeMatch and calls NO pantry mutator — viewing a recipe never changes
// pantry items or quantities.
export function RecipeDialog({ match, onClose }: { match: RecipeMatch | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!match) return null;
  const { recipe, matched, missing } = match;
  const has = new Set(matched);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-title"
      onClick={onClose}
    >
      <div className="card-surface my-auto flex max-h-[90vh] max-h-[85dvh] w-full max-w-lg flex-col p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-primary">
              <ChefHat className="h-5 w-5" />
            </span>
            <div>
              <h2 id="recipe-title" className="text-lg font-semibold">{recipe.title}</h2>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {recipe.minutes} mnt</span>
                {recipe.servings != null && (
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {recipe.servings} porsi</span>
                )}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <div>
          <h3 className="text-sm font-semibold">Bahan</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Yang bertanda centang tersedia di dapurmu. Jumlah tetap perlu kamu periksa sendiri.</p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {recipe.ingredients.map((ing) => {
              const present = has.has(ing);
              return (
                <li key={ing} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${present ? "bg-mint/60 text-primary-deep" : "bg-muted text-muted-foreground"}`}>
                  {present ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <Minus className="h-4 w-4 shrink-0" />}
                  <span className="capitalize">{ing}</span>
                </li>
              );
            })}
          </ul>
          {missing.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Perlu dibeli: {missing.join(", ")}.</p>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold">Cara memasak</h3>
          <ol className="mt-3 grid gap-2.5">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/85">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-primary">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground">Saran resep berdasarkan bahan di dapurmu. Selalu periksa kondisi bahan sebelum memasak.</p>
        </div>
      </div>
    </div>
  );
}
