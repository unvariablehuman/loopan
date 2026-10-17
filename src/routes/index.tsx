import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { BeforeYouShop, HeroCard, PantryGlance, ThisWeek, UseFirstSection } from "@/components/loopan/Widgets";
import { getOnboardingSnapshot } from "@/lib/onboarding-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loopan — Manfaatkan yang Ada, Jangan Sia-siakan" },
      { name: "description", content: "Lacak belanjaan, pantau tanggal kedaluwarsa, dan kurangi pemborosan makanan dengan dasbor dapur pintar Loopan." },
      { property: "og:title", content: "Loopan — Manfaatkan yang Ada, Jangan Sia-siakan" },
      { property: "og:description", content: "Dasbor dapur pintar yang membantu rumah tangga mengurangi pemborosan makanan." },
    ],
  }),
  component: Index,
});

function Index() {
  const router = useRouter();
  // Client-only entry redirect: on first open of "/", if the user has not passed the opening flow
  // yet, send them to /welcome once. The flag lives in localStorage (no SSR access), so this is a
  // mount effect, not a loader/beforeLoad — that avoids a server-side false "unset" bouncing
  // returning users on every refresh. It only runs on "/" (this component), never loops (once
  // `entered` is true it does nothing), and never reads or clears the pantry key.
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    if (!getOnboardingSnapshot().entered) {
      redirected.current = true;
      router.navigate({ to: "/welcome", replace: true });
    }
  }, [router]);

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
