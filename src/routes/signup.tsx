import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Info, UserPlus } from "lucide-react";
import { z } from "zod";
import { LoopanWordmark } from "@/components/loopan/Logo";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useProfile } from "@/hooks/use-profile";
import { PROFILE_NAME_MAX } from "@/lib/profile";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Daftar — Loopan" },
      { name: "description", content: "Buat profil demo Loopan untuk mencoba mengelola dapurmu. Mode simulasi, tanpa akun sungguhan." },
    ],
  }),
  component: Signup,
});

const schema = z
  .object({
    name: z.string().trim().min(1, "Masukkan nama").max(PROFILE_NAME_MAX, `Maksimal ${PROFILE_NAME_MAX} karakter`),
    email: z.string().trim().min(1, "Masukkan email").email("Format email tidak valid"),
    password: z.string().min(1, "Masukkan kata sandi").min(6, "Kata sandi minimal 6 karakter"),
    confirm: z.string().min(1, "Ulangi kata sandi"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Konfirmasi kata sandi tidak cocok",
  });

type Form = { name: string; email: string; password: string; confirm: string };

const field =
  "h-11 w-full rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40 aria-[invalid=true]:border-coral-foreground";

function Signup() {
  const router = useRouter();
  const { enter } = useOnboarding();
  const { profile, saveProfile } = useProfile();
  const [form, setForm] = useState<Form>({ name: "", email: "", password: "", confirm: "" });
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
    // Simulated signup only: no account is created, nothing is sent anywhere, and the password is
    // NEVER stored. We optionally reuse the existing profile store for the display name only.
    enter("signup");
    saveProfile({ ...profile, name: r.data.name });
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
          <h1 className="text-xl font-semibold text-foreground">Buat profil Loopan</h1>
          <p className="text-sm text-muted-foreground">Mulai kelola dapurmu dalam hitungan menit.</p>
        </div>

        <div role="note" className="mt-5 flex gap-2 rounded-lg bg-mint px-3 py-2.5 text-xs text-primary-deep">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Mode demo: pendaftaran hanya simulasi. Loopan tidak membuat akun sungguhan maupun
            mengirim data ke server.
          </span>
        </div>

        <form noValidate onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="signup-name" className="text-sm font-medium">
              Nama
            </label>
            <input
              id="signup-name"
              autoComplete="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={field}
              {...aria("name")}
            />
            <Err k="name" />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="signup-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password" className="text-sm font-medium">
              Kata sandi
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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

          <div className="grid gap-1.5">
            <label htmlFor="signup-confirm" className="text-sm font-medium">
              Konfirmasi kata sandi
            </label>
            <input
              id="signup-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              className={field}
              {...aria("confirm")}
            />
            <Err k="confirm" />
          </div>

          <button
            type="submit"
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Daftar
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <p className="text-muted-foreground">
            Sudah punya akun?{" "}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-deep">
              Masuk
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
