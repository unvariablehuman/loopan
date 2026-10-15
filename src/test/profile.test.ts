import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AVATAR_PRESETS,
  DEFAULT_PROFILE,
  PROFILE_KEY,
  avatarInitial,
  loadProfile,
  sanitizeProfile,
  saveProfile,
  validateProfileFields,
} from "@/lib/profile";
import {
  __resetProfileStoreForTests,
  commitProfile,
  getProfileSnapshot,
  getServerProfileSnapshot,
  subscribeProfile,
} from "@/lib/profile-store";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? (data[k] as string) : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

const DEFAULTS = { name: "Sabrina", kitchen: "Dapur rumah", avatar: { kind: "initial" } };

describe("profile defaults", () => {
  it("are Sabrina / Dapur rumah / initial avatar", () => {
    expect(DEFAULT_PROFILE).toEqual(DEFAULTS);
    expect(PROFILE_KEY).toBe("loopan.profile.v1");
  });
});

describe("loadProfile / sanitizeProfile", () => {
  it("returns defaults for missing, corrupt and wrong-shaped storage", () => {
    expect(loadProfile(fakeStorage())).toEqual(DEFAULTS);
    expect(loadProfile(null)).toEqual(DEFAULTS);
    for (const raw of ["{not json", "null", "[]", "42", '"text"', "{}"]) {
      expect(loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))).toEqual(DEFAULTS);
    }
  });

  it("defaults when getItem throws", () => {
    const s = {
      getItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadProfile(s)).toEqual(DEFAULTS);
  });

  it("falls back field by field", () => {
    expect(sanitizeProfile({ name: "Ayu" })).toEqual({ ...DEFAULTS, name: "Ayu" });
    expect(sanitizeProfile({ name: 5, kitchen: "Dapur Kos" })).toEqual({ ...DEFAULTS, kitchen: "Dapur Kos" });
    expect(sanitizeProfile({ name: "   ", kitchen: "x".repeat(41) })).toEqual(DEFAULTS);
    expect(sanitizeProfile({ name: "  Ayu  " }).name).toBe("Ayu");
  });

  it("sanitises the avatar", () => {
    const initial = { kind: "initial" };
    expect(sanitizeProfile({ avatar: { kind: "bogus" } }).avatar).toEqual(initial);
    expect(sanitizeProfile({ avatar: "leaf" }).avatar).toEqual(initial);
    expect(sanitizeProfile({ avatar: { kind: "preset", id: "pizza" } }).avatar).toEqual(initial);
    expect(sanitizeProfile({ avatar: { kind: "photo", dataUrl: "http://evil/x.png" } }).avatar).toEqual(initial);
    expect(sanitizeProfile({ avatar: { kind: "photo", dataUrl: "data:image/jpeg;base64," + "A".repeat(150_000) } }).avatar).toEqual(initial);
    for (const p of AVATAR_PRESETS) {
      expect(sanitizeProfile({ avatar: { kind: "preset", id: p.id } }).avatar).toEqual({ kind: "preset", id: p.id });
    }
    const url = "data:image/jpeg;base64,/9j/AAAA";
    expect(sanitizeProfile({ avatar: { kind: "photo", dataUrl: url } }).avatar).toEqual({ kind: "photo", dataUrl: url });
  });
});

describe("validateProfileFields", () => {
  it("trims and accepts valid values, including exactly 40 chars", () => {
    expect(validateProfileFields({ name: "  Ayu ", kitchen: " Dapur " })).toEqual({ ok: true, value: { name: "Ayu", kitchen: "Dapur" } });
    expect(validateProfileFields({ name: "a".repeat(40), kitchen: "b".repeat(40) }).ok).toBe(true);
  });

  it("rejects empty and whitespace-only values", () => {
    expect(validateProfileFields({ name: "   ", kitchen: "" })).toEqual({
      ok: false,
      errors: { name: "Masukkan nama", kitchen: "Masukkan nama dapur" },
    });
  });

  it("rejects values over 40 characters", () => {
    expect(validateProfileFields({ name: "a".repeat(41), kitchen: "ok" })).toEqual({
      ok: false,
      errors: { name: "Maksimal 40 karakter" },
    });
    expect(validateProfileFields({ name: "ok", kitchen: "b".repeat(41) })).toEqual({
      ok: false,
      errors: { kitchen: "Maksimal 40 karakter" },
    });
  });
});

describe("avatarInitial", () => {
  it("uppercases the first letter, trims, and falls back to ?", () => {
    expect(avatarInitial("  sabrina")).toBe("S");
    expect(avatarInitial("")).toBe("?");
    expect(avatarInitial("   ")).toBe("?");
  });
});

describe("saveProfile", () => {
  it("round-trips through storage under loopan.profile.v1", () => {
    const s = fakeStorage();
    const p = { name: "Budi", kitchen: "Dapur Kos", avatar: { kind: "preset", id: "leaf" } } as const;
    expect(saveProfile(p, s)).toEqual({ ok: true });
    expect(Object.keys(s.data)).toEqual(["loopan.profile.v1"]);
    expect(loadProfile(s)).toEqual(p);
  });

  it("returns an Indonesian error instead of throwing when storage fails", () => {
    const s = {
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    const res = saveProfile(DEFAULT_PROFILE, s);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Penyimpanan penuh/);
    expect(saveProfile(DEFAULT_PROFILE, null).ok).toBe(false);
  });
});

describe("profile store (module-level, no provider)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetProfileStoreForTests();
  });
  afterEach(() => vi.restoreAllMocks());

  it("serves defaults on the server snapshot even when storage holds another profile", () => {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: "Ayu" }));
    expect(getServerProfileSnapshot()).toEqual(DEFAULTS);
    expect(getProfileSnapshot().name).toBe("Ayu");
  });

  it("returns a stable snapshot reference", () => {
    expect(getProfileSnapshot()).toBe(getProfileSnapshot());
  });

  it("commit success updates the snapshot, persists, and notifies", () => {
    const cb = vi.fn();
    subscribeProfile(cb);
    const res = commitProfile({ name: "Budi", kitchen: "Dapur Kos", avatar: { kind: "initial" } });
    expect(res).toEqual({ ok: true });
    expect(getProfileSnapshot().name).toBe("Budi");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "{}").name).toBe("Budi");
  });

  it("commit failure leaves the snapshot unchanged and does not notify", () => {
    const before = getProfileSnapshot();
    const cb = vi.fn();
    subscribeProfile(cb);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const res = commitProfile({ name: "Budi", kitchen: "Dapur Kos", avatar: { kind: "initial" } });
    expect(res.ok).toBe(false);
    expect(getProfileSnapshot()).toBe(before);
    expect(cb).not.toHaveBeenCalled();
  });
});
