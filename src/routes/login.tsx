import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Info, LogIn } from "lucide-react";
import { z } from "zod";
import { LoopanWordmark } from "@/components/loopan/Logo";
import { useOnboarding } from "@/hooks/use-onboarding";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — Loopan" },
      { name: "description", content: "Masuk ke Loopan untuk mengelola dapurmu. Mode demo, tanpa akun sungguhan." },
    ],
  }),
  component: Login,
});

const schema = z.object({
  email: z.string().trim().min(1, "Masukkan email").email("Format email tidak valid"),
  password: z.string().min(1, "Masukkan kata sandi").min(6, "Kata sandi minimal 6 karakter"),
});

type Form = z.input<typeof schema>;

const field =
  "h-11 w-full rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40 aria-[invalid=true]:border-coral-foreground";

function Login() {
  const router = useRouter();
  const { enter } = useOnboarding();
  const [form, setForm] = useState<Form>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: typeof errors = {};
      for (const i of r.error.issues) errs[i.path[0] as keyof Form] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    // Simulated login only: we set the onboarding flag and never store the email/password.
    enter("login");
    router.navigate({ to: "/", replace: true });
  };

  const aria = (k: keyof Form) => ({
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
  });
  const Err = ({ k }: { k: keyof Form }) =>
    errors[k] ? (
      <span id={`${k}-err`} className="text-xs font-medium text-coral-foreground">
        {errors[k]}
      </span>
    ) : null;

  return (
    <div className="grid min-h-screen w-full place-items-center bg-sage px-5 py-10">
      <div className="card-surface w-full max-w-md p-6 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link to="/" className="text-primary" aria-label="Loopan">
            <LoopanWordmark className="text-2xl font-extrabold leading-none tracking-tight text-primary" />
          </Link>
          <h1 className="text-xl font-semibold text-foreground">Masuk ke Loopan</h1>
          <p className="text-sm text-muted-foreground">Lanjutkan mengelola dapur dan belanjaanmu.</p>
        </div>

        <div role="note" className="mt-5 flex gap-2 rounded-lg bg-mint px-3 py-2.5 text-xs text-primary-deep">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Mode demo: Loopan belum terhubung ke layanan akun. Masuk hanya simulasi dan tidak
            memverifikasi akun sungguhan.
          </span>
        </div>

        <form noValidate onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="login-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={field}
              {...aria("email")}
            />
            <Err k="email" />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="login-password" className="text-sm font-medium">
              Kata sandi
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className={`${field} pr-11`}
                {...aria("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <Err k="password" />
          </div>

          <button
            type="submit"
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Masuk
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <p className="text-muted-foreground">
            Belum punya akun?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:text-primary-deep">
              Daftar
            </Link>
          </p>
          <Link to="/welcome" className="text-xs text-muted-foreground hover:text-foreground">
            Kembali ke halaman pembuka
          </Link>
        </div>
      </div>
    </div>
  );
}
