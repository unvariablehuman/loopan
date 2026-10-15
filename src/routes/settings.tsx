import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings } from "lucide-react";
import { SectionHead } from "@/components/loopan/Widgets";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Loopan" },
      { name: "description", content: "Choose how Loopan reminds you about expiring food." },
      { property: "og:title", content: "Settings — Loopan" },
      { property: "og:description", content: "Choose how Loopan reminds you about expiring food." },
    ],
  }),
  component: SettingsPage,
});

const opts = [
  { id: "daily", label: "Daily use-first summary", desc: "A morning list of items to use soon." },
  { id: "expiry", label: "Expiry reminders", desc: "A heads-up 2 days before something expires." },
  { id: "weekly", label: "Weekly insights", desc: "A short recap of what went unused." },
];

function SettingsPage() {
  const [on, setOn] = useState<Record<string, boolean>>({ daily: true, expiry: true, weekly: false });
  return (
    <section className="card-surface max-w-2xl p-5 sm:p-6">
      <SectionHead icon={Settings} title="Settings" sub="Notification preferences (preview only)." />
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
      </ul>
    </section>
  );
}
