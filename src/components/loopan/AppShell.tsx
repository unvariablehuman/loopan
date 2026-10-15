import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BarChart3, Bell, ChevronDown, Home, Lightbulb, Package, Search, Settings, Sprout, X, ScanBarcode, CalendarClock,
} from "lucide-react";
import { LoopanMark } from "./Logo";
import { usePantry } from "./PantryContext";
import { statusLabel } from "@/lib/pantry-data";

const nav = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/pantry", label: "My Pantry", icon: Package },
  { to: "/use-first", label: "Use First", icon: Lightbulb },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sage px-5 py-7 lg:flex">
        <Link to="/" className="flex items-center gap-3 px-2 text-primary">
          <LoopanMark className="h-11 w-11 shrink-0" />
          <div className="min-w-0">
            <div className="text-2xl font-extrabold leading-none tracking-tight text-primary">Loopan</div>
            <div className="mt-1 text-xs text-muted-foreground">Keep Food in the Loop</div>
          </div>
        </Link>
        <nav className="mt-10 flex flex-col gap-1.5" aria-label="Main">
          {nav.map((n) => {
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active ? "bg-card/70 text-primary-deep shadow-soft" : "text-foreground/75 hover:bg-card/40 hover:text-foreground"
                }`}
              >
                <n.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-card/60 p-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">S</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">Sabrina</div>
            <div className="text-xs text-muted-foreground">Home pantry</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <Header />
        <main className="flex-1 px-4 pb-10 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 px-2 py-2 backdrop-blur lg:hidden">
        {nav.map((n) => {
          const active = path === n.to;
          return (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <ScanDialog />
    </div>
  );
}

function Header() {
  const { items } = usePantry();
  const [q, setQ] = useState("");
  const results = q.trim()
    ? items.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];
  return (
    <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-background/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8 lg:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" className="shrink-0 text-primary lg:hidden" aria-label="Loopan home"><LoopanMark className="h-9 w-9" /></Link>
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, recipes, or anything..."
            aria-label="Search pantry"
            className="h-11 w-full rounded-full border bg-card pl-11 pr-10 text-sm shadow-soft placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
          {q.trim() && (
            <div className="card-surface absolute inset-x-0 top-13 z-30 overflow-hidden p-1.5">
              {results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No products match “{q}”.</p>
              ) : (
                results.map((p) => (
                  <Link key={p.id} to="/pantry" onClick={() => setQ("")} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
                    <span className="min-w-0 truncate"><span className="font-semibold">{p.name}</span> <span className="text-muted-foreground">· {p.category}</span></span>
                    <span className="shrink-0 text-xs text-muted-foreground">{statusLabel(p.daysLeft)}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button aria-label="Notifications" className="relative grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-muted">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-coral-foreground ring-2 ring-background" />
        </button>
        <span className="hidden h-11 w-11 place-items-center rounded-full border bg-card text-primary shadow-soft sm:grid" aria-hidden="true">
          <Sprout className="h-5 w-5" />
        </span>
      </div>
    </header>
  );
}

function ScanDialog() {
  const { scanMode, setScanMode, addItem } = usePantry();
  const [name, setName] = useState("Greek yogurt");
  const [days, setDays] = useState(5);
  if (!scanMode) return null;
  const isBarcode = scanMode === "barcode";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" role="dialog" aria-modal="true" aria-labelledby="scan-title" onClick={() => setScanMode(null)}>
      <div className="card-surface w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-primary">
              {isBarcode ? <ScanBarcode className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
            </span>
            <div>
              <h2 id="scan-title" className="text-lg font-semibold">{isBarcode ? "Scan barcode" : "Scan expiry label"}</h2>
              <p className="text-xs text-muted-foreground">Demo mode — camera scanning comes later.</p>
            </div>
          </div>
          <button onClick={() => setScanMode(null)} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 grid h-32 place-items-center rounded-xl border-2 border-dashed border-primary/30 bg-mint/60 text-sm text-muted-foreground">
          {isBarcode ? "Point your camera at a barcode" : "Point your camera at the date label"}
        </div>
        <div className="mt-5 grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">Product name
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Days until expiry
            <input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-10 rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40" />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setScanMode(null)} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button
            disabled={!name.trim()}
            onClick={() => {
              const d = new Date(); d.setDate(d.getDate() + days);
              addItem({ id: `${Date.now()}`, name: name.trim(), category: "Added", daysLeft: days, quantity: "1", expires: d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) });
              setScanMode(null);
            }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-deep disabled:opacity-50"
          >
            Add to pantry
          </button>
        </div>
      </div>
    </div>
  );
}
