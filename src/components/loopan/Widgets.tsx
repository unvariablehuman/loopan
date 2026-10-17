import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle, ArrowRight, BarChart3, Boxes, CalendarDays, Camera, Check, ChevronRight, Hourglass, Leaf, MapPin, Pencil, Package, ScanBarcode, ShoppingCart, Wallet, X,
} from "lucide-react";
import hero from "@/assets/hero-groceries.jpg";
import { usePantry } from "./PantryContext";
import { CookIdeas } from "./CookIdeas";
import { byPriority, categoryLabel, dateTypeLabel, daysLeft, formatDate, formatPrice, isUrgent, locationLabel, statusLabel, statusOf, type PantryItem } from "@/lib/pantry-data";

export const DemoTag = () => (
  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Data contoh</span>
);

export function SectionHead({ icon: Icon, title, sub, action }: { icon: typeof Leaf; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="flex min-w-0 gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold leading-tight">{title}</h2>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function HeroCard() {
  const { openScanner } = usePantry();
  return (
    <section className="relative overflow-hidden rounded-2xl bg-sage shadow-soft">
      <img src={hero} alt="Kantong kertas berisi sayuran segar" width={1024} height={768} className="absolute inset-y-0 right-0 hidden h-full w-[42%] object-cover md:block [mask-image:linear-gradient(to_right,transparent,black_30%)]" />
      <div className="relative p-6 sm:p-8 md:w-[72%]">
        <div className="flex items-center gap-3">
          <Leaf className="h-7 w-7 text-primary" />
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">Selamat pagi!</h1>
        </div>
        <p className="mt-2 text-[15px] text-foreground/80">Yuk, kelola isi dapurmu dan manfaatkan makanan sebelum terbuang.</p>
        <div className="mt-6 flex flex-col gap-4 rounded-xl bg-card p-4 shadow-soft 2xl:flex-row 2xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint text-primary"><Camera className="h-6 w-6" /></span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">Pindai dan tambahkan produk</div>
              <div className="text-xs text-muted-foreground">Tambahkan belanjaan dalam hitungan detik</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openScanner("barcode")} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-soft transition hover:bg-primary-deep">
              <ScanBarcode className="h-4 w-4" /> Pindai barcode
            </button>
            <button onClick={() => openScanner("expiry")} className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2.5 text-[13px] font-semibold text-primary-deep transition hover:bg-mint">
              <Camera className="h-4 w-4" /> Pindai label kedaluwarsa
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const toneBg = { coral: "bg-coral/50", sage: "bg-sage/70", mint: "bg-mint" } as const;
const badge = {
  invalid: "bg-muted text-foreground",
  past: "bg-coral-foreground text-primary-foreground",
  today: "bg-coral-foreground text-primary-foreground",
  soon: "bg-amber text-amber-foreground",
  ok: "bg-sage text-primary-deep",
} as const;
const autoTone = { invalid: "mint", past: "coral", today: "coral", soon: "sage", ok: "mint" } as const;

export function StatusBadge({ item }: { item: PantryItem }) {
  const d = daysLeft(item.expiresOn);
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badge[statusOf(d)]}`}>{statusLabel(d, item.dateType)}</span>;
}

// Shared action row: primary "Tandai digunakan" fills the width, Edit is a compact icon
// button so the two never collide. Used on cards (primaryActions pages) and in the dialog.
function ItemActions({ p, onDone }: { p: PantryItem; onDone?: () => void }) {
  const { markUsed, openEditor } = usePantry();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => { markUsed(p.id); onDone?.(); }}
        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-deep"
      >
        <Check className="h-4 w-4 shrink-0" /> <span className="truncate">Tandai digunakan</span>
      </button>
      <button
        onClick={() => { openEditor({ mode: "edit", item: p }); onDone?.(); }}
        aria-label={`Edit ${p.name}`}
        title={`Edit ${p.name}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border hover:bg-muted"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}

// Full item detail shown in a modal (opened from "Lihat detail") so the content and action
// buttons get room to breathe instead of cramming inside the card. Presentational: it only
// triggers the existing markUsed/openEditor via ItemActions.
//
// It is rendered through a portal to document.body ON PURPOSE: ProductCard's <article> has
// `hover:-translate-y-0.5` (a transform turns the card into the containing block for any
// `position: fixed` descendant) and `overflow-hidden` (clips it), so a dialog nested inside the
// card gets squeezed into the card's box while hovered. The portal escapes both, and also any
// stacking context created by wrappers such as the `opacity-80` group on the Use First page.
function ItemDetailDialog({ item, onClose }: { item: PantryItem | null; onClose: () => void }) {
  const isOpen = item !== null;
  // Only listen for Escape while open (every card mounts one of these dialogs).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);
  if (!item || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/30 p-4" role="dialog" aria-modal="true" aria-labelledby="item-detail-title" onClick={onClose}>
      <div className="card-surface my-auto flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-primary"><Leaf className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 id="item-detail-title" className="truncate text-lg font-semibold">{item.name}</h2>
              <p className="truncate text-xs text-muted-foreground">{categoryLabel(item.category)} · {locationLabel(item.location)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {item.image && (
            <img src={item.image} alt={item.name} className="mb-4 max-h-36 w-full rounded-xl border bg-foreground/5 object-cover" />
          )}
          <div className="mb-4"><StatusBadge item={item} /></div>
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center gap-2 text-foreground/85"><CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" /> {dateTypeLabel(item.dateType)} {formatDate(item.expiresOn)}</div>
            <div className="flex items-center gap-2 text-foreground/85"><Package className="h-4 w-4 shrink-0 text-muted-foreground" /> Jumlah: {item.quantity}</div>
            <div className="flex items-center gap-2 text-foreground/85"><MapPin className="h-4 w-4 shrink-0 text-muted-foreground" /> {locationLabel(item.location)}</div>
            {item.price != null && (
              <div className="flex items-center gap-2 text-foreground/85"><Wallet className="h-4 w-4 shrink-0 text-muted-foreground" /> Perkiraan harga: {formatPrice(item.price)}</div>
            )}
          </dl>
        </div>

        <div className="border-t p-4">
          <ItemActions p={item} onDone={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

// A scannable pantry-item card. The WHOLE card opens the shared ItemDetailDialog (which holds the
// quantity/price and the Tandai digunakan / Edit actions), so there is no separate "Lihat detail"
// button and no secondary info duplicated on the card. The card stays a non-interactive <article>;
// a single stretched-overlay button covers it, so there is exactly one keyboard-focusable control
// per card and no nested interactive elements (the status badge sits above it via z-index).
export function ProductCard({ p }: { p: PantryItem }) {
  const [detail, setDetail] = useState(false);
  const tone = p.tone ?? autoTone[statusOf(daysLeft(p.expiresOn))];
  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-2xl border ${toneBg[tone]} transition focus-within:-translate-y-0.5 focus-within:shadow-lift hover:-translate-y-0.5 hover:shadow-lift`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" width={944} height={704} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center text-primary/40"><Leaf className="h-10 w-10" /></div>
        )}
        {/* z-10 keeps the badge above the stretched overlay button so it stays readable. */}
        <span className="absolute right-3 top-3 z-10"><StatusBadge item={p} /></span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="flex items-start gap-2 text-[15px] font-semibold">
          <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="line-clamp-2">{p.name}</span>
        </h3>
        <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{locationLabel(p.location)} · {categoryLabel(p.category)}</p>
        <p className="mt-auto flex items-center gap-2 pt-3 text-[13px] text-foreground/80"><CalendarDays className="h-4 w-4 shrink-0" /> {dateTypeLabel(p.dateType)} {formatDate(p.expiresOn)}</p>
      </div>
      {/* Stretched overlay: makes the entire card one accessible button opening the detail modal. */}
      <button
        type="button"
        onClick={() => setDetail(true)}
        aria-label={`Lihat detail ${p.name}`}
        className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      />
      <ItemDetailDialog item={detail ? p : null} onClose={() => setDetail(false)} />
    </article>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border-2 border-dashed bg-mint/40 px-6 py-10 text-center">
      <Leaf className="h-8 w-8 text-primary/60" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function UseFirstSection() {
  const { items, ready, openEditor } = usePantry();
  // Shared 3-day urgency rule (lib/pantry-data isUrgent) so this teaser agrees with the Use First page; teaser caps at 3.
  const urgent = [...items].filter((i) => isUrgent(i.expiresOn)).sort(byPriority);
  const list = urgent.slice(0, 3);
  const extra = urgent.length - list.length; // urgent items not shown in the 3-card teaser
  return (
    <section className="card-surface flex flex-col p-5 sm:p-6">
      <SectionHead icon={Hourglass} title="Prioritas Penggunaan" sub="Barang yang perlu segera diperhatikan." action={
        <Link to="/use-first" className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">Lihat semua <ArrowRight className="h-3.5 w-3.5" /></Link>
      } />
      <div className="mt-5">
        {!ready ? <div className="h-64 animate-pulse rounded-xl bg-mint/60" /> : list.length === 0 ? (
          <EmptyState title="Belum ada yang mendesak" text="Tidak ada barang yang akan kedaluwarsa dalam beberapa hari ke depan." action={
            <button onClick={() => openEditor({ mode: "add" })} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep">Tambahkan ke Dapur</button>
          } />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </div>
      {/* Adds value under the cards: how many urgent items the teaser is hiding. */}
      {extra > 0 && (
        <Link to="/use-first" className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-mint/60 px-4 py-3 text-sm font-medium text-primary-deep transition hover:bg-mint">
          <span>+{extra} barang lagi perlu segera dipakai</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}
      {/* Recipe ideas that use the urgent items above (same ranking and preferences as /cook). */}
      {ready && list.length > 0 && <CookIdeas items={items} />}
      <p className="mt-4 text-[11px] text-muted-foreground">Tanggal hanya panduan — selalu periksa makanan sebelum dikonsumsi.</p>
    </section>
  );
}

export function PantryGlance() {
  const { items, ready } = usePantry();
  // Shared urgency rule — now also counts missing/invalid-date items as at-risk, matching Use First and Statistik.
  const atRisk = items.filter((i) => isUrgent(i.expiresOn));
  const value = atRisk.reduce((s, i) => s + (i.price ?? 0), 0);
  // Two short counts share the top row; the Rupiah amount gets its own full-width row below.
  // A 3-equal-column grid left the price only ~85px, which broke "Rp 16.004" mid-number.
  const counts = [
    { icon: Boxes, value: items.length, label: "barang", tone: "bg-mint text-primary" },
    { icon: AlertTriangle, value: atRisk.length, label: "segera kedaluwarsa", tone: "bg-coral text-coral-foreground" },
  ];
  return (
    <section className="rounded-2xl bg-sage p-5 shadow-soft">
      <h2 className="text-[21px] font-semibold leading-tight">Isi dapurmu sekilas</h2>
      <div className="mt-4 rounded-xl bg-card p-4">
        <div className="grid grid-cols-2 divide-x">
          {counts.map((s) => (
            <div key={s.label} className="min-w-0 px-3 first:pl-0 last:pr-0">
              <span className={`grid h-9 w-9 place-items-center rounded-full ${s.tone}`}><s.icon className="h-4 w-4" /></span>
              <div className="mt-3 text-lg font-bold">{ready ? s.value : "–"}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 border-t pt-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber text-amber-foreground"><Wallet className="h-4 w-4" /></span>
          <div className="min-w-0">
            {/* whitespace-nowrap keeps "Rp 16.004" on one line; the row spans the whole card, so there is room. */}
            <div className="whitespace-nowrap text-lg font-bold">{ready ? formatPrice(value) : "–"}</div>
            <div className="text-xs text-muted-foreground">Perkiraan nilai barang prioritas</div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-foreground/60">Nilai memakai harga yang kamu masukkan; barang tanpa harga dihitung Rp 0.</p>
    </section>
  );
}

export function ThisWeek() {
  const { usedThisWeek } = usePantry();
  const used = usedThisWeek.length;
  const saved = usedThisWeek.reduce((s, u) => s + (u.price ?? 0), 0);
  const r = 52;
  return (
    <section className="card-surface p-5">
      <SectionHead icon={BarChart3} title="Minggu ini" sub="Barang yang kamu tandai sudah digunakan (7 hari terakhir)" action={
        <Link to="/insights" className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">Lihat statistik <ArrowRight className="h-3.5 w-3.5" /></Link>
      } />
      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-mint)" strokeWidth="10" />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div><div className="text-xl font-bold">{used}</div><div className="text-[11px] text-muted-foreground">ditandai terpakai</div></div>
          </div>
        </div>
        <dl className="divide-y text-sm">
          <div className="pb-3"><dt className="text-xs text-muted-foreground">Barang ditandai digunakan</dt><dd className="font-semibold">{used} barang</dd></div>
          <div className="pt-3"><dt className="text-xs text-muted-foreground">Estimasi nilai belanja terpakai</dt><dd className="font-semibold [overflow-wrap:anywhere]">{formatPrice(saved)}</dd></div>
        </dl>
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Perkiraan dari harga yang kamu masukkan — bukan penghematan terverifikasi.</p>
    </section>
  );
}

const shopSeed = [
  { id: "eggs", name: "Telur", note: "Tersedia (6 pcs)", have: true },
  { id: "milk", name: "Susu", note: "Tersedia (1 L)", have: true },
  { id: "tomatoes", name: "Tomat", note: "Tidak ada di dapur", have: false },
];

export function BeforeYouShop() {
  const [list, setList] = useState(shopSeed);
  return (
    <section className="card-surface p-5">
      <SectionHead icon={ShoppingCart} title="Sebelum Berbelanja" sub="Contoh daftar — ketuk untuk mengubah." action={<DemoTag />} />
      <ul className="mt-4 grid gap-2">
        {list.map((i) => (
          <li key={i.id}>
            <button
              onClick={() => setList((l) => l.map((x) => (x.id === i.id ? { ...x, have: !x.have, note: x.have ? "Tidak ada di dapur" : "Tersedia" } : x)))}
              aria-pressed={i.have}
              className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-3 text-left transition hover:bg-mint/60"
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${i.have ? "border-primary bg-mint text-primary" : "border-border"}`}>
                {i.have && <Check className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{i.name}</span>
                <span className={`block text-xs ${i.have ? "text-muted-foreground" : "text-coral-foreground"}`}>{i.note}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
