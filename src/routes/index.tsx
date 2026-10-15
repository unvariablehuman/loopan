import { createFileRoute } from "@tanstack/react-router";
import { BeforeYouShop, HeroCard, PantryGlance, ThisWeek, UseFirstSection } from "@/components/loopan/Widgets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loopan — Jaga Makanan Tetap dalam Putaran" },
      { name: "description", content: "Lacak belanjaan, pantau tanggal kedaluwarsa, dan kurangi pemborosan makanan dengan dasbor dapur pintar Loopan." },
      { property: "og:title", content: "Loopan — Jaga Makanan Tetap dalam Putaran" },
      { property: "og:description", content: "Dasbor dapur pintar yang membantu rumah tangga mengurangi pemborosan makanan." },
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
      </div>
      <div className="grid content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
        <PantryGlance />
        <ThisWeek />
        <BeforeYouShop />
      </div>
    </div>
  );
}
