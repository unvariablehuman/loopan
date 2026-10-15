import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { DemoTag, SectionHead, ThisWeek, WasteChart } from "@/components/loopan/Widgets";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Loopan" },
      { name: "description", content: "Spot patterns in what goes unused and waste less each week." },
      { property: "og:title", content: "Insights — Loopan" },
      { property: "og:description", content: "Spot patterns in what goes unused and waste less each week." },
    ],
  }),
  component: Insights,
});

const tips = [
  { t: "Leafy greens are often left unused", d: "Buy smaller bunches, or freeze extras for soups." },
  { t: "Dairy is used well", d: "Most dairy items are finished before their date." },
  { t: "Fruits peak mid-week", d: "Plan a fruit snack on Wednesdays to use ripe items." },
];

function Insights() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="card-surface p-5 sm:p-6">
        <SectionHead icon={BarChart3} title="Unused items by category" sub="This week compared with last week." action={<DemoTag />} />
        <div className="mt-6"><WasteChart tall /></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {tips.map((x) => (
            <div key={x.t} className="rounded-xl bg-mint p-4">
              <p className="text-sm font-semibold">{x.t}</p>
              <p className="mt-1 text-xs text-foreground/75">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="content-start"><ThisWeek /></div>
    </div>
  );
}
