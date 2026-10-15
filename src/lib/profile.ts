// Pure profile logic (no React). The profile is a UI-only, device-local identity: there is no
// auth and no database. It lives under its OWN localStorage key and never touches the pantry
// store (PantryContext / its storage key), so resetting demo pantry data cannot reset it.

export const PROFILE_KEY = "loopan.profile.v1";
export const PROFILE_NAME_MAX = 40;
// A 128x128 JPEG at q0.85 is ~5-15 KB; this cap only guards against hand-edited/bloated storage.
export const PROFILE_PHOTO_MAX_CHARS = 150_000;

export const AVATAR_PRESETS = [
  { id: "leaf", label: "Daun" },
  { id: "sprout", label: "Tunas" },
  { id: "carrot", label: "Wortel" },
  { id: "apple", label: "Apel" },
  { id: "chef-hat", label: "Koki" },
  { id: "salad", label: "Salad" },
] as const;

export type PresetAvatarId = (typeof AVATAR_PRESETS)[number]["id"];

export type Avatar =
  | { kind: "initial" }
  | { kind: "preset"; id: PresetAvatarId }
  | { kind: "photo"; dataUrl: string };

export type Profile = { name: string; kitchen: string; avatar: Avatar };

export const DEFAULT_PROFILE: Profile = Object.freeze({
  name: "Sabrina",
  kitchen: "Dapur rumah",
  avatar: Object.freeze({ kind: "initial" as const }),
});

export const STORAGE_ERROR = "Penyimpanan penuh atau tidak tersedia. Perubahan belum tersimpan.";

function isPresetId(v: unknown): v is PresetAvatarId {
  return typeof v === "string" && AVATAR_PRESETS.some((p) => p.id === v);
}

function cleanText(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t.length >= 1 && t.length <= PROFILE_NAME_MAX ? t : fallback;
}

function cleanAvatar(v: unknown): Avatar {
  if (typeof v !== "object" || v === null) return { kind: "initial" };
  const a = v as Record<string, unknown>;
  if (a["kind"] === "preset" && isPresetId(a["id"])) return { kind: "preset", id: a["id"] };
  if (a["kind"] === "photo") {
    const url = a["dataUrl"];
    if (typeof url === "string" && url.startsWith("data:image/") && url.length <= PROFILE_PHOTO_MAX_CHARS) {
      return { kind: "photo", dataUrl: url };
    }
  }
  return { kind: "initial" };
}

// Field-by-field recovery: a bad field falls back to its own default without discarding the rest.
export function sanitizeProfile(raw: unknown): Profile {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_PROFILE, avatar: { kind: "initial" } };
  }
  const r = raw as Record<string, unknown>;
  return {
    name: cleanText(r["name"], DEFAULT_PROFILE.name),
    kitchen: cleanText(r["kitchen"], DEFAULT_PROFILE.kitchen),
    avatar: cleanAvatar(r["avatar"]),
  };
}

export type ProfileFieldErrors = { name?: string; kitchen?: string };

export function validateProfileFields(input: {
  name: string;
  kitchen: string;
}):
  | { ok: true; value: { name: string; kitchen: string } }
  | { ok: false; errors: ProfileFieldErrors } {
  const name = input.name.trim();
  const kitchen = input.kitchen.trim();
  const errors: ProfileFieldErrors = {};
  if (name.length === 0) errors.name = "Masukkan nama";
  else if (name.length > PROFILE_NAME_MAX) errors.name = "Maksimal 40 karakter";
  if (kitchen.length === 0) errors.kitchen = "Masukkan nama dapur";
  else if (kitchen.length > PROFILE_NAME_MAX) errors.kitchen = "Maksimal 40 karakter";
  if (errors.name !== undefined || errors.kitchen !== undefined) return { ok: false, errors };
  return { ok: true, value: { name, kitchen } };
}

export function avatarInitial(name: string): string {
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : "?";
}

function defaultReadStorage(): Pick<Storage, "getItem"> | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function defaultWriteStorage(): Pick<Storage, "setItem"> | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadProfile(storage: Pick<Storage, "getItem"> | null = defaultReadStorage()): Profile {
  if (!storage) return sanitizeProfile(null);
  try {
    const raw = storage.getItem(PROFILE_KEY);
    if (raw === null) return sanitizeProfile(null);
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return sanitizeProfile(null);
  }
}

export function saveProfile(
  profile: Profile,
  storage: Pick<Storage, "setItem"> | null = defaultWriteStorage(),
): { ok: true } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: STORAGE_ERROR };
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfile(profile)));
    return { ok: true };
  } catch {
    return { ok: false, error: STORAGE_ERROR };
  }
}
