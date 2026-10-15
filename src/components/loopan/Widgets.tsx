import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle, ArrowRight, BarChart3, Boxes, CalendarDays, Camera, Check, ChevronRight, Hourglass, Leaf, ScanBarcode, ShoppingCart, Wallet,
} from "lucide-react";
import hero from "@/assets/hero-groceries.jpg";
import { usePantry } from "./PantryContext";
import { byPriority, dateTypeLabel, daysLeft, formatDate, statusLabel, statusOf, wasteData, type PantryItem } from "@/lib/pantry-data";
import { Pencil } from "lucide-react";

export const DemoTag = () => (
  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Demo data</span>
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
      <img src={hero} alt="Paper bag with fresh vegetables" width={1024} height={768} className="absolute inset-y-0 right-0 hidden h-full w-[42%] object-cover md:block [mask-image:linear-gradient(to_right,transparent,black_30%)]" />
      <div className="relative p-6 sm:p-8 md:w-[72%]">
        <div className="flex items-center gap-3">
          <Leaf className="h-7 w-7 text-primary" />
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">Good morning!</h1>
        </div>
        <p className="mt-2 text-[15px] text-foreground/80">Let’s keep your food in the loop.</p>
        <div className="mt-6 flex flex-col gap-4 rounded-xl bg-card p-4 shadow-soft 2xl:flex-row 2xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint text-primary"><Camera className="h-6 w-6" /></span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">Scan and add products</div>
              <div className="text-xs text-muted-foreground">Add groceries in seconds</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openScanner("barcode")} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-soft transition hover:bg-primary-deep">
              <ScanBarcode className="h-4 w-4" /> Scan barcode
            </button>
            <button onClick={() => openScanner("expiry")} className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2.5 text-[13px] font-semibold text-primary-deep transition hover:bg-mint">
              <Camera className="h-4 w-4" /> Scan expiry label
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

export function ProductCard({ p }: { p: PantryItem }) {
  const { markUsed, openEditor } = usePantry();
  const [open, setOpen] = useState(false);
  const tone = p.tone ?? autoTone[statusOf(daysLeft(p.expiresOn))];
  return (
    <article className={`group flex flex-col overflow-hidden rounded-2xl border ${toneBg[tone]} transition hover:-translate-y-0.5 hover:shadow-lift`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" width={944} height={704} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center text-primary/40"><Leaf className="h-10 w-10" /></div>
        )}
        <span className="absolute right-3 top-3"><StatusBadge item={p} /></span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold"><Leaf className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{p.name}</span></h3>
        <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{p.category} · {p.location}</p>
        <p className="mb-4 mt-3 flex items-center gap-2 text-[13px] text-foreground/80"><CalendarDays className="h-4 w-4" /> {dateTypeLabel(p.dateType)} {formatDate(p.expiresOn)}</p>
        {open && (
          <div className="mb-3 grid gap-2 rounded-lg bg-card/80 p-3 text-xs text-foreground/80">
            <span>Quantity: {p.quantity}{p.price != null && ` · ~$${p.price.toFixed(2)}`}</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => markUsed(p.id)} className="flex items-center justify-center gap-1.5 rounded-full bg-primary py-1.5 font-semibold text-primary-foreground hover:bg-primary-deep"><Check className="h-3.5 w-3.5" /> Mark used</button>
              <button onClick={() => openEditor({ mode: "edit", item: p })} className="flex items-center justify-center gap-1.5 rounded-full border py-1.5 font-semibold hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Edit</button>
            </div>
          </div>
        )}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-card/70 py-2 text-[13px] font-semibold text-primary-deep transition hover:bg-card">
          {open ? "Hide details" : "View details"} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
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
  const list = [...items].filter((i) => { const d = daysLeft(i.expiresOn); return d === null || d <= 4; }).sort(byPriority).slice(0, 3);
  return (
    <section className="card-surface p-5 sm:p-6">
      <SectionHead icon={Hourglass} title="Use first" sub="Items that need your attention soon." action={
        <Link to="/use-first" className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
      } />
      <div className="mt-5">
        {!ready ? <div className="h-64 animate-pulse rounded-xl bg-mint/60" /> : list.length === 0 ? (
          <EmptyState title="Nothing urgent right now" text="No items are expiring in the next few days." action={
            <button onClick={() => openEditor({ mode: "add" })} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep">Add food item</button>
          } />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Dates are a guide only — always check food before eating.</p>
    </section>
  );
}

export function WasteChart({ tall = false }: { tall?: boolean }) {
  const max = 15;
  return (
    <div>
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary" />This week</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-sage" />Last week</span>
      </div>
      <div className={`mt-4 flex items-end justify-between gap-2 border-b ${tall ? "h-56" : "h-36"}`} role="img" aria-label="Illustrative waste by category, this week vs last week">
        {wasteData.map((d) => (
          <div key={d.label} className="flex h-full flex-1 items-end justify-center gap-1">
            <div className="w-3 rounded-t-md bg-primary sm:w-4" style={{ height: `${(d.thisWeek / max) * 100}%` }} title={`${d.label} this week: ${d.thisWeek}`} />
            <div className="w-3 rounded-t-md bg-sage sm:w-4" style={{ height: `${(d.lastWeek / max) * 100}%` }} title={`${d.label} last week: ${d.lastWeek}`} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {wasteData.map((d) => <span key={d.label} className="flex-1 truncate text-center text-[11px] text-muted-foreground">{d.label}</span>)}
      </div>
    </div>
  );
}

export function WasteInsights() {
  const t = wasteData.reduce((s, d) => s + d.thisWeek, 0);
  const l = wasteData.reduce((s, d) => s + d.lastWeek, 0);
  return (
    <section className="card-surface p-5 sm:p-6">
      <SectionHead icon={Leaf} title="Waste less, one week at a time." sub="See your progress and find patterns in your food waste." action={<DemoTag />} />
      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <WasteChart />
          <p className="mt-4 text-sm text-foreground/80">
            <span className="font-semibold text-primary">{t} items</span> left unused this week vs {l} last week.
          </p>
        </div>
        <div className="flex flex-col rounded-xl bg-mint p-4">
          <Leaf className="h-6 w-6 text-primary" />
          <p className="mt-2 text-sm font-semibold">Leafy greens are often left unused.</p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/75">Try using them within 2 days of buying, or blend extras into a smoothie.</p>
          <Link to="/insights" className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-deep">
            View insights <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PantryGlance() {
  const { items, ready } = usePantry();
  const atRisk = items.filter((i) => { const d = daysLeft(i.expiresOn); return d !== null && d <= 3; });
  const value = atRisk.reduce((s, i) => s + (i.price ?? 0), 0);
  const stats = [
    { icon: Boxes, value: items.length, label: "items", tone: "bg-mint text-primary" },
    { icon: AlertTriangle, value: atRisk.length, label: "expiring soon", tone: "bg-coral text-coral-foreground" },
    { icon: Wallet, value: `~$${value.toFixed(2)}`, label: "est. value at risk", tone: "bg-amber text-amber-foreground" },
  ];
  return (
    <section className="rounded-2xl bg-sage p-5 shadow-soft">
      <h2 className="text-[21px] font-semibold leading-tight">Your pantry<br />at a glance</h2>
      <div className="mt-4 grid grid-cols-3 divide-x rounded-xl bg-card p-4">
        {stats.map((s) => (
          <div key={s.label} className="px-2 first:pl-0 last:pr-0">
            <span className={`grid h-9 w-9 place-items-center rounded-full ${s.tone}`}><s.icon className="h-4 w-4" /></span>
            <div className="mt-3 text-lg font-bold">{ready ? s.value : "–"}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-foreground/60">Value uses the prices you entered; items without a price count as $0.</p>
    </section>
  );
}

export function ThisWeek() {
  const { usedThisWeek } = usePantry();
  const used = usedThisWeek.length;
  const saved = usedThisWeek.reduce((s, u) => s + (u.price ?? 0), 0);
  const goal = 8;
  const pct = Math.min(used / goal, 1);
  const r = 52, c = 2 * Math.PI * r;
  return (
    <section className="card-surface p-5">
      <SectionHead icon={BarChart3} title="This week" sub="Items you marked as used (last 7 days)" />
      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-mint)" strokeWidth="10" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div><div className="text-xl font-bold">{used}/{goal}</div><div className="text-[11px] text-muted-foreground">weekly goal</div></div>
          </div>
        </div>
        <dl className="divide-y text-sm">
          <div className="pb-3"><dt className="text-xs text-muted-foreground">Items marked used</dt><dd className="font-semibold">{used} {used === 1 ? "item" : "items"}</dd></div>
          <div className="pt-3"><dt className="text-xs text-muted-foreground">Est. grocery value used</dt><dd className="font-semibold">~${saved.toFixed(2)}</dd></div>
        </dl>
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Estimate from your entered prices — not verified savings.</p>
    </section>
  );
}

const shopSeed = [
  { id: "eggs", name: "Eggs", note: "In stock (6 pcs)", have: true },
  { id: "milk", name: "Milk", note: "In stock (1 L)", have: true },
  { id: "tomatoes", name: "Tomatoes", note: "Not in pantry", have: false },
];

export function BeforeYouShop() {
  const [list, setList] = useState(shopSeed);
  return (
    <section className="card-surface p-5">
      <SectionHead icon={ShoppingCart} title="Before you shop" sub="Sample checklist — tap to toggle." action={<DemoTag />} />
      <ul className="mt-4 grid gap-2">
        {list.map((i) => (
          <li key={i.id}>
            <button
              onClick={() => setList((l) => l.map((x) => (x.id === i.id ? { ...x, have: !x.have, note: x.have ? "Not in pantry" : "In stock" } : x)))}
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
