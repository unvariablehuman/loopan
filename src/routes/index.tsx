import { createFileRoute } from "@tanstack/react-router";
import { BeforeYouShop, HeroCard, PantryGlance, ThisWeek, UseFirstSection, WasteInsights } from "@/components/loopan/Widgets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loopan — Keep Food in the Loop" },
      { name: "description", content: "Track groceries, watch expiry dates, and waste less food with Loopan's smart pantry dashboard." },
      { property: "og:title", content: "Loopan — Keep Food in the Loop" },
      { property: "og:description", content: "A smart pantry dashboard that helps households reduce food waste." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 gap-6">
        <HeroCard />
        <UseFirstSection />
        <WasteInsights />
      </div>
      <div className="grid content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
        <PantryGlance />
        <ThisWeek />
        <BeforeYouShop />
      </div>
    </div>
  );
}
