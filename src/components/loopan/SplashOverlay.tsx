import { useEffect, useState } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { LoopanWordmark } from "./Logo";

// Transient full-screen overlay shown on first open / full page refresh — NOT a route, so SPA
// navigations never retrigger it (it lives at the top level and unmounts itself once). SSR-safe:
// starts hidden on the server and the first client render (so the markup matches), then a
// mount-once effect reveals it and schedules its own unmount after a short minimum duration.
// It does not block interaction underneath beyond its brief lifetime.
const MIN_DURATION_MS = 900; // within the requested 0.8-1.2s window
const REDUCED_DURATION_MS = 150;

export function SplashOverlay() {
  // Hidden until mounted so SSR output and first client render agree.
  const [phase, setPhase] = useState<"idle" | "visible" | "gone">("idle");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let prefersReduced = false;
    try {
      prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      prefersReduced = false;
    }
    setReduced(prefersReduced);
    setPhase("visible");
    const timer = window.setTimeout(
      () => setPhase("gone"),
      prefersReduced ? REDUCED_DURATION_MS : MIN_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  if (phase !== "visible") return null;

  return (
    <div
      role="status"
      aria-label="Memuat Loopan"
      className="fixed inset-0 z-[60] grid place-items-center bg-sage px-6"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          className={`grid h-16 w-16 place-items-center rounded-2xl bg-card text-primary shadow-soft ${
            reduced ? "" : "animate-pulse"
          }`}
        >
          <Leaf className="h-8 w-8" aria-hidden="true" />
        </span>
        <LoopanWordmark className="text-3xl font-extrabold leading-none tracking-tight text-primary" />
        <p className="max-w-xs text-sm font-medium text-primary-deep">
          Manfaatkan yang Ada, Jangan Sia-siakan.
        </p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {!reduced && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Menyiapkan dapurmu...
        </p>
      </div>
    </div>
  );
}
