import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, Loader2, Trash2, Upload, UserRound, X } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useProfile } from "@/hooks/use-profile";
import { useOnboarding } from "@/hooks/use-onboarding";
import {
  AVATAR_PRESETS,
  validateProfileFields,
  type Avatar,
  type PresetAvatarId,
  type ProfileFieldErrors,
} from "@/lib/profile";
import { processPhoto } from "@/lib/profile-photo";
import { ProfileAvatar } from "./ProfileAvatar";

const field =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40 aria-[invalid=true]:border-coral-foreground";
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), [href], [tabindex]:not([tabindex="-1"])';

type Choice = "initial" | "photo" | PresetAvatarId;

// Mounted fresh on every open (the wrapper below returns null when closed), so the draft always
// starts from the stored profile and Batal / Escape / backdrop simply unmount and discard it.
// Nothing reaches the store or localStorage until Simpan succeeds.
function ProfileDialogBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { reset: resetOnboarding } = useOnboarding();
  const { profile, saveProfile } = useProfile();
  const [name, setName] = useState(profile.name);
  const [kitchen, setKitchen] = useState(profile.kitchen);
  const [photo, setPhoto] = useState<string | null>(profile.avatar.kind === "photo" ? profile.avatar.dataUrl : null);
  const [choice, setChoice] = useState<Choice>(
    profile.avatar.kind === "photo" ? "photo" : profile.avatar.kind === "preset" ? profile.avatar.id : "initial",
  );
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const kitchenRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Return focus to whatever opened the dialog (ProfileButton focuses its trigger first).
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  // Start on the first field.
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const avatar: Avatar =
    choice === "photo" && photo
      ? { kind: "photo", dataUrl: photo }
      : choice === "initial" || choice === "photo"
        ? { kind: "initial" }
        : { kind: "preset", id: choice };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // Stop here so the mobile drawer's document-level Escape listener doesn't also close it.
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // Simple focus trap: wrap Tab / Shift+Tab at the ends of the panel.
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    const inside = active instanceof Node && !!panelRef.current?.contains(active);
    if (e.shiftKey && (active === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setPhotoError(null);
    setBusy(true);
    const res = await processPhoto(file);
    setBusy(false);
    if (res.ok) {
      setPhoto(res.dataUrl);
      setChoice("photo");
    } else {
      setPhotoError(res.error);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoError(null);
    if (choice === "photo") setChoice("initial");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = validateProfileFields({ name, kitchen });
    if (!v.ok) {
      setErrors(v.errors);
      setSaveError(null);
      (v.errors.name ? nameRef.current : kitchenRef.current)?.focus();
      return;
    }
    setErrors({});
    const res = saveProfile({ name: v.value.name, kitchen: v.value.kitchen, avatar });
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    onClose();
  };

  // Leaves the demo and returns to the opening flow. Clears ONLY the onboarding flag (its own
  // key) — pantry and profile data are left untouched — then navigates to /welcome and closes.
  const backToWelcome = () => {
    resetOnboarding();
    onClose();
    router.navigate({ to: "/welcome" });
  };

  const ariaFor = (k: "name" | "kitchen") => ({
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `profile-${k}-err` : undefined,
  });
  const Err = ({ k }: { k: "name" | "kitchen" }) =>
    errors[k] ? (
      <span id={`profile-${k}-err`} className="text-xs font-medium text-coral-foreground">
        {errors[k]}
      </span>
    ) : null;

  const optionClass = (selected: boolean) =>
    `relative flex h-14 cursor-pointer items-center justify-center rounded-xl border transition focus-within:ring-2 focus-within:ring-ring/40 ${
      selected ? "border-primary bg-mint/60 ring-2 ring-primary/30" : "hover:bg-muted"
    }`;

  return (
    <div
      data-profile-overlay=""
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4"
      onClick={onClose}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="card-surface flex max-h-[90vh] max-h-[90dvh] w-full max-w-md flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-2 pt-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-primary">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="profile-title" className="text-lg font-semibold">Edit profil</h2>
                <p className="text-xs text-muted-foreground">Perubahan tersimpan di perangkat ini.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
            <div className="grid gap-4">
              {/* Label is separate from the error so the input's accessible name stays "Nama pengguna". */}
              <div className="grid gap-1.5">
                <label htmlFor="profile-name" className="text-sm font-medium">Nama pengguna</label>
                <input id="profile-name" ref={nameRef} value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} className={field} {...ariaFor("name")} />
                <Err k="name" />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="profile-kitchen" className="text-sm font-medium">Nama dapur</label>
                <input id="profile-kitchen" ref={kitchenRef} value={kitchen} autoComplete="off" onChange={(e) => setKitchen(e.target.value)} className={field} {...ariaFor("kitchen")} />
                <Err k="kitchen" />
              </div>


              <fieldset id="profile-avatar-section" className="grid gap-2 text-sm font-medium">
                <legend className="mb-1.5">Avatar</legend>
                <div role="radiogroup" aria-label="Pilihan avatar" className="grid grid-cols-4 gap-2">
                  <label className={optionClass(choice === "initial")} title="Inisial">
                    <input type="radio" name="profile-avatar" className="sr-only" aria-label="Avatar inisial" checked={choice === "initial"} onChange={() => setChoice("initial")} />
                    <ProfileAvatar name={name} avatar={{ kind: "initial" }} className="h-9 w-9" />
                  </label>
                  {AVATAR_PRESETS.map((p) => (
                    <label key={p.id} className={optionClass(choice === p.id)} title={p.label}>
                      <input type="radio" name="profile-avatar" className="sr-only" aria-label={`Avatar ${p.label.toLowerCase()}`} checked={choice === p.id} onChange={() => setChoice(p.id)} />
                      <ProfileAvatar name={name} avatar={{ kind: "preset", id: p.id }} className="h-9 w-9" />
                    </label>
                  ))}
                  {photo && (
                    <label className={optionClass(choice === "photo")} title="Foto">
                      <input type="radio" name="profile-avatar" className="sr-only" aria-label="Foto profil" checked={choice === "photo"} onChange={() => setChoice("photo")} />
                      <ProfileAvatar name={name} avatar={{ kind: "photo", dataUrl: photo }} className="h-9 w-9" />
                    </label>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" tabIndex={-1} aria-label="Berkas foto profil" className="hidden" onChange={onFile} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                    Unggah foto
                  </button>
                  {photo && (
                    <>
                      <img src={photo} alt="Pratinjau foto profil" className="h-12 w-12 rounded-full border object-cover" />
                      <button type="button" onClick={removePhoto} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Hapus foto
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs font-normal text-muted-foreground">Foto dipotong persegi dan disimpan hanya di perangkat ini.</p>
                {photoError && <p role="alert" className="text-xs font-medium text-coral-foreground">{photoError}</p>}
              </fieldset>
            </div>
          </div>

          <div className="shrink-0 border-t px-6 py-4">
            {saveError && <p role="alert" className="mb-3 text-xs font-medium text-coral-foreground">{saveError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Exit the demo back to the opening flow. Touches only the onboarding key. */}
              <button
                type="button"
                onClick={backToWelcome}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Keluar demo
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button>
                <button type="submit" disabled={busy} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-deep disabled:opacity-60">Simpan</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Rendered through a portal to document.body so no ancestor transform / overflow / stacking
// context (sidebar, mobile drawer) can clip or trap it. Only mounts after a user click, so
// `document` always exists; render null on the server / when closed.
export function EditProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<ProfileDialogBody onClose={onClose} />, document.body);
}
