import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bell, X } from "lucide-react";
import { categoryLabel, locationLabel } from "@/lib/pantry-data";
import { groupNotifications, type AppNotification, type NotificationKind } from "@/lib/notifications";
import { EmptyState } from "./Widgets";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const dot: Record<NotificationKind, string> = {
  expired: "bg-coral-foreground",
  today: "bg-coral-foreground",
  soon: "bg-primary",
  invalid: "bg-muted-foreground",
};

interface DrawerProps {
  ready: boolean;
  notifications: AppNotification[];
  onClose: () => void;
}

// Mounted fresh on every open. Focus return to the bell is handled by the Header (onClose).
function DrawerBody({ ready, notifications, onClose }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Slide-in: mount off-screen, then flip to translate-x-0 after first paint so the transition runs.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Document-level listener (like the mobile menu) so Escape works wherever focus is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Simple focus trap (same approach as EditProfileDialog): wrap Tab / Shift+Tab at the panel ends.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    const inside = active instanceof Node && !!panelRef.current?.contains(active);
    if (e.shiftKey && (active === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  };

  const groups = groupNotifications(notifications);
  const hasAlerts = ready && notifications.length > 0;

  return (
    <div data-notification-overlay="" className="fixed inset-0 z-50" onKeyDown={trapTab}>
      <div
        data-testid="notification-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-foreground/30 transition-opacity duration-200 motion-reduce:transition-none ${entered ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
        className={`absolute right-0 top-0 flex h-full max-h-dvh w-[calc(100%-1rem)] flex-col rounded-l-2xl border-l bg-card shadow-soft transition-transform duration-200 ease-out motion-reduce:transition-none sm:w-96 ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-primary">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id="notification-title" className="text-lg font-semibold">Notifikasi</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div data-notification-list="" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {!ready ? (
            <div className="h-40 animate-pulse rounded-xl bg-mint/60" aria-hidden="true" />
          ) : notifications.length === 0 ? (
            <EmptyState title="Belum ada notifikasi" text="Peringatan kedaluwarsa dari isi dapurmu akan muncul di sini." />
          ) : (
            groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h3 className="px-2 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pt-0">{g.label}</h3>
                <ul className="grid gap-0.5">
                  {g.items.map((n) => (
                    <li key={n.id}>
                      <Link
                        to="/pantry"
                        search={{ q: n.name }}
                        onClick={onClose}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[n.kind]}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{n.name}</span>
                          <span className="block text-xs text-foreground/80">{n.detail}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {locationLabel(n.location)} · {categoryLabel(n.category)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {hasAlerts && (
          <div className="shrink-0 border-t px-5 py-3">
            <Link
              to="/use-first"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Lihat semua di Prioritas <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Rendered through a portal to document.body: the sticky backdrop-blur header becomes the
// containing block for `position: fixed` descendants (and overflow-hidden would clip them), so
// rendering inside the header would mispositon the drawer. Same approach as EditProfileDialog.
export function NotificationDrawer({ open, ...rest }: DrawerProps & { open: boolean }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<DrawerBody {...rest} />, document.body);
}
