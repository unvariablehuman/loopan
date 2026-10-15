import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell, ChefHat, Home, Lightbulb, Menu, Package, PanelLeftClose, PanelLeftOpen,
  Search, Settings, X,
} from "lucide-react";
import { LoopanBadge, LoopanWordmark } from "./Logo";
import { ProfileButton } from "./ProfileButton";
import { NotificationDrawer } from "./NotificationDrawer";
import { deriveNotifications } from "@/lib/notifications";
import { usePantry } from "./PantryContext";
import { categoryLabel, daysLeft, statusLabel } from "@/lib/pantry-data";
import { ItemEditor } from "./ItemEditor";
import { BarcodeScanner } from "./BarcodeScanner";
import { ExpiryScanner } from "./ExpiryScanner";
import { Toaster } from "sonner";

// UI-only persistence for the desktop sidebar collapse choice. This is its own namespaced key
// and never touches the pantry store (`loopan.pantry.v1`) or PantryContext.
const SIDEBAR_KEY = "loopan.ui.sidebar";

// Statistik (/insights) is no longer a persistent nav destination — it stays reachable by
// direct URL and via the "Lihat statistik" link in the Beranda stats section. These five are
// all first-class, so the sidebar and bottom bar render a single flat list (no secondary group).
const nav = [
  { to: "/", label: "Beranda", icon: Home },
  { to: "/pantry", label: "Dapur Saya", icon: Package },
  { to: "/use-first", label: "Prioritas", icon: Lightbulb },
  { to: "/cook", label: "Resep", icon: ChefHat },
  { to: "/settings", label: "Pengaturan", icon: Settings },
] as const;

type NavEntry = (typeof nav)[number];

// Single sidebar Link renderer so the active/inactive styling lives in one place. Renders an
// icon rail (icon only, accessible via aria-label + title tooltip) when `collapsed`, otherwise
// icon + label. `onNavigate` lets the mobile drawer close itself after a destination is picked.
function SidebarLink({
  entry,
  active,
  collapsed = false,
  onNavigate,
}: {
  entry: NavEntry;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={entry.to}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? entry.label : undefined}
      title={collapsed ? entry.label : undefined}
      onClick={onNavigate}
      className={`flex items-center rounded-xl py-3 text-sm font-medium transition-colors ${
        collapsed ? "justify-center px-0" : "gap-3.5 px-4"
      } ${
        active ? "bg-card/70 text-primary-deep shadow-soft" : "text-foreground/75 hover:bg-card/40 hover:text-foreground"
      }`}
    >
      <entry.icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : ""}`} />
      {!collapsed && entry.label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Desktop sidebar collapse — UI-only state. The server always renders expanded, so the first
  // client render must too (reading storage in the initializer would cause a hydration mismatch
  // that React does not repair). The stored choice is applied in a mount effect, and the write
  // effect waits for that load so the initial `false` can never clobber a stored "collapsed".
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarLoaded, setSidebarLoaded] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "collapsed");
    } catch {
      // Storage unavailable: stay expanded.
    }
    setSidebarLoaded(true);
  }, []);
  useEffect(() => {
    if (!sidebarLoaded) return;
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      // Preference just won't persist.
    }
  }, [collapsed, sidebarLoaded]);

  // Mobile drawer open state + Escape-to-close (mirrors RecipeDialog's listener pattern).
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen w-full">
      <aside
        data-collapsed={collapsed ? "true" : "false"}
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-sage py-7 transition-[width,padding] duration-200 ease-in-out lg:flex ${
          collapsed ? "w-20 px-3" : "w-64 px-5"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "justify-between gap-2"}`}>
          <Link
            to="/"
            className="flex items-center gap-3 px-2 text-primary"
            {...(collapsed ? { "aria-label": "Loopan, ke Beranda", title: "Loopan" } : {})}
          >
            {collapsed ? (
              <LoopanBadge className="h-9 w-9" />
            ) : (
              <div className="min-w-0">
                <LoopanWordmark />
                <div className="mt-1 text-xs text-muted-foreground">Jaga Makanan Tetap dalam Putaran</div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-card/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>
        <nav className="mt-10 flex flex-col gap-1.5" aria-label="Utama">
          {nav.map((n) => (
            <SidebarLink key={n.to} entry={n} active={path === n.to} collapsed={collapsed} />
          ))}
        </nav>
        <ProfileButton collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 pb-10 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* Mobile bottom nav: all five destinations in equal cells (quick thumb reach). */}
      <nav aria-label="Utama" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 px-2 py-2 backdrop-blur lg:hidden">
        {nav.map((n) => {
          const active = path === n.to;
          return (
            <Link key={n.to} to={n.to} aria-current={active ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
              <n.icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile drawer: richer left-sliding menu opened from the header menu toggle. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="card-surface fixed left-0 top-0 flex h-full w-72 flex-col rounded-none p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <Link to="/" className="text-primary" onClick={() => setMenuOpen(false)} aria-label="Beranda Loopan">
                <LoopanWordmark />
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Tutup menu"
                className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1.5" aria-label="Utama">
              {nav.map((n) => (
                <SidebarLink key={n.to} entry={n} active={path === n.to} onNavigate={() => setMenuOpen(false)} />
              ))}
            </nav>
            <ProfileButton />
          </div>
        </div>
      )}

      <ItemEditor />
      <BarcodeScanner />
      <ExpiryScanner />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { items, ready } = usePantry();
  const [q, setQ] = useState("");
  const results = q.trim()
    ? items.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  // Nothing is derived before the store has loaded (items is [] then), so no dot / empty state flashes.
  const notifications = useMemo(() => (ready ? deriveNotifications(items) : []), [items, ready]);
  const hasAlerts = notifications.length > 0;
  const closeNotifs = () => {
    setNotifOpen(false);
    bellRef.current?.focus();
  };
  return (
    <>
    <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-background/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8 lg:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Buka menu"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="shrink-0 text-primary lg:hidden" aria-label="Beranda Loopan"><LoopanWordmark className="text-xl font-extrabold leading-none tracking-tight text-primary" /></Link>
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk, resep, atau apa saja..."
            aria-label="Cari dapur"
            className="h-11 w-full rounded-full border bg-card pl-11 pr-10 text-sm shadow-soft placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Hapus pencarian" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
          {q.trim() && (
            <div className="card-surface absolute inset-x-0 top-13 z-30 overflow-hidden p-1.5">
              {results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">Tidak ada produk yang cocok dengan “{q}”.</p>
              ) : (
                results.map((p) => (
                  <Link key={p.id} to="/pantry" search={{ q: p.name }} onClick={() => setQ("")} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
                    <span className="min-w-0 truncate"><span className="font-semibold">{p.name}</span> <span className="text-muted-foreground">· {categoryLabel(p.category)}</span></span>
                    <span className="shrink-0 text-xs text-muted-foreground">{statusLabel(daysLeft(p.expiresOn), p.dateType)}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {/* The dot means "there are alerts to look at" (derived from live pantry state) and disappears
            when there are none. Deliberately no count and no persisted read/unread state: items change
            as dates pass, so a stored flag would go stale. */}
        <button
          ref={bellRef}
          type="button"
          onClick={() => setNotifOpen((o) => !o)}
          aria-label={hasAlerts ? "Notifikasi, ada peringatan" : "Notifikasi"}
          aria-haspopup="dialog"
          aria-expanded={notifOpen}
          className="relative grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {hasAlerts && (
            <span data-testid="notification-dot" aria-hidden="true" className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-coral-foreground ring-2 ring-background" />
          )}
        </button>
      </div>
    </header>
    <NotificationDrawer open={notifOpen} ready={!!ready} notifications={notifications} onClose={closeNotifs} />
    </>
  );
}
