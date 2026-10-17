import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, LogIn, Sparkles } from "lucide-react";
import hero from "@/assets/hero-groceries.jpg";
import { LoopanWordmark } from "@/components/loopan/Logo";
import { useOnboarding } from "@/hooks/use-onboarding";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Selamat datang di Loopan" },
      {
        name: "description",
        content:
          "Kelola bahan makanan, pantau tanggal kedaluwarsa, dan temukan inspirasi resep agar tidak ada bahan yang terbuang sia-sia.",
      },
      { property: "og:title", content: "Selamat datang di Loopan" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const router = useRouter();
  const { enter } = useOnboarding();

  // "Coba Demo": enter the flow in demo mode and go straight to the dashboard. This NEVER reads
  // or clears the pantry key and never calls any reset — the stored pantry data stays intact.
  const tryDemo = () => {
    enter("demo");
    router.navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-sage">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-2 lg:gap-12 lg:px-8">
        {/* Left: brand, headline, actions */}
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          {/* Brand mark only — not a link: this IS the entry page, and linking to "/" would just bounce back here. */}
          <span className="w-fit text-primary" aria-label="Loopan">
            <LoopanWordmark className="text-3xl font-extrabold leading-none tracking-tight text-primary" />
          </span>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-primary-deep sm:text-4xl">
              Dapur lebih teratur, makanan lebih bermanfaat.
            </h1>
            <p className="max-w-md text-sm text-muted-foreground sm:text-base">
              Kelola bahan makanan, pantau tanggal kedaluwarsa, dan temukan inspirasi resep agar
              tidak ada bahan yang terbuang sia-sia.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:max-w-sm">
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Masuk
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-card px-5 text-sm font-semibold text-primary-deep transition-colors hover:bg-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Daftar
            </Link>
            <button
              type="button"
              onClick={tryDemo}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-primary-deep transition-colors hover:bg-card/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Coba Demo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Akun masih dalam mode demo. Loopan belum terhubung ke layanan akun apa pun.
          </p>
        </div>

        {/* Right: everyday-grocery visual */}
        <div className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-2xl shadow-soft">
            <img
              src={hero}
              alt="Beragam bahan makanan segar sehari-hari seperti sayur, buah, dan telur tertata rapi."
              className="h-56 w-full object-cover sm:h-72 lg:h-[28rem]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
