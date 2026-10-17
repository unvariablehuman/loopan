import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ONBOARDING,
  ONBOARDING_KEY,
  ONBOARDING_STORAGE_ERROR,
  loadOnboarding,
  sanitizeOnboarding,
  saveOnboarding,
} from "@/lib/onboarding";
import {
  __resetOnboardingStoreForTests,
  commitOnboarding,
  getOnboardingSnapshot,
  getServerOnboardingSnapshot,
  subscribeOnboarding,
} from "@/lib/onboarding-store";

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

beforeEach(() => {
  window.localStorage.clear();
  __resetOnboardingStoreForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  __resetOnboardingStoreForTests();
});

describe("onboarding defaults and sanitize", () => {
  it("uses the new key and defaults to the flag unset", () => {
    expect(ONBOARDING_KEY).toBe("loopan.onboarding.v1");
    expect(DEFAULT_ONBOARDING).toEqual({ entered: false, mode: null });
  });

  it.each([null, undefined, [], 42, "x", true])(
    "returns the default for wrong-shaped input %j",
    (raw) => {
      expect(sanitizeOnboarding(raw)).toEqual({ entered: false, mode: null });
    },
  );

  it("coerces entered to a strict boolean and keeps a valid mode", () => {
    expect(sanitizeOnboarding({ entered: true, mode: "demo" })).toEqual({ entered: true, mode: "demo" });
    expect(sanitizeOnboarding({ entered: true, mode: "login" })).toEqual({ entered: true, mode: "login" });
    expect(sanitizeOnboarding({ entered: true, mode: "signup" })).toEqual({ entered: true, mode: "signup" });
    // Non-literal true values do not count as entered.
    expect(sanitizeOnboarding({ entered: 1, mode: "demo" })).toEqual({ entered: false, mode: null });
    expect(sanitizeOnboarding({ entered: "true", mode: "demo" })).toEqual({ entered: false, mode: null });
  });

  it("drops an unknown mode and forces mode:null when entered is false", () => {
    expect(sanitizeOnboarding({ entered: true, mode: "hacker" })).toEqual({ entered: true, mode: null });
    expect(sanitizeOnboarding({ entered: false, mode: "demo" })).toEqual({ entered: false, mode: null });
    expect(sanitizeOnboarding({ entered: true })).toEqual({ entered: true, mode: null });
  });

  it("load survives missing, corrupt, wrong-shaped JSON, null storage and a throwing getItem", () => {
    expect(loadOnboarding(fakeStorage())).toEqual({ entered: false, mode: null });
    expect(loadOnboarding(fakeStorage({ [ONBOARDING_KEY]: "{not json" }))).toEqual({ entered: false, mode: null });
    expect(loadOnboarding(fakeStorage({ [ONBOARDING_KEY]: "[1,2]" }))).toEqual({ entered: false, mode: null });
    expect(loadOnboarding(null)).toEqual({ entered: false, mode: null });
    expect(
      loadOnboarding({
        getItem: () => {
          throw new Error("denied");
        },
      }),
    ).toEqual({ entered: false, mode: null });
  });

  it("round-trips a stored flag", () => {
    const s = fakeStorage();
    expect(saveOnboarding({ entered: true, mode: "demo" }, s)).toEqual({ ok: true });
    expect(Object.keys(s.data)).toEqual([ONBOARDING_KEY]);
    expect(loadOnboarding(s)).toEqual({ entered: true, mode: "demo" });
  });

  it("returns an Indonesian error instead of throwing when storage fails or is missing", () => {
    const failing = {
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(saveOnboarding({ entered: true, mode: "demo" }, failing)).toEqual({
      ok: false,
      error: ONBOARDING_STORAGE_ERROR,
    });
    expect(saveOnboarding({ entered: true, mode: "demo" }, null)).toEqual({
      ok: false,
      error: ONBOARDING_STORAGE_ERROR,
    });
  });
});

describe("onboarding store", () => {
  it("server snapshot is the defaults while the client snapshot reads storage and is stable", () => {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ entered: true, mode: "login" }));
    expect(getServerOnboardingSnapshot()).toEqual({ entered: false, mode: null });
    expect(getOnboardingSnapshot()).toEqual({ entered: true, mode: "login" });
    expect(getOnboardingSnapshot()).toBe(getOnboardingSnapshot());
  });

  it("set/clear round-trip through commit, updating the snapshot and notifying once each", () => {
    const cb = vi.fn();
    const unsub = subscribeOnboarding(cb);

    expect(commitOnboarding({ entered: true, mode: "signup" })).toEqual({ ok: true });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(getOnboardingSnapshot()).toEqual({ entered: true, mode: "signup" });
    expect(window.localStorage.getItem(ONBOARDING_KEY)).toBe(JSON.stringify({ entered: true, mode: "signup" }));

    expect(commitOnboarding({ ...DEFAULT_ONBOARDING })).toEqual({ ok: true });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(getOnboardingSnapshot()).toEqual({ entered: false, mode: null });

    unsub();
  });

  it("a failed commit leaves the snapshot and subscribers untouched (never throws)", () => {
    const before = getOnboardingSnapshot();
    const cb = vi.fn();
    const unsub = subscribeOnboarding(cb);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const res = commitOnboarding({ entered: true, mode: "demo" });
    expect(res.ok).toBe(false);
    expect(getOnboardingSnapshot()).toBe(before);
    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it("writes ONLY its own key and never touches pantry/profile/recipe-prefs/sidebar keys", () => {
    const seeded = {
      "loopan.pantry.v1": "pantry-sentinel",
      "loopan.profile.v1": "profile-sentinel",
      "loopan.recipe-prefs.v1": "recipe-sentinel",
      "loopan.ui.sidebar": "sidebar-sentinel",
    };
    for (const [k, v] of Object.entries(seeded)) window.localStorage.setItem(k, v);
    commitOnboarding({ entered: true, mode: "demo" });
    for (const [k, v] of Object.entries(seeded)) expect(window.localStorage.getItem(k)).toBe(v);
    // Four sentinels + the onboarding key.
    expect(window.localStorage.length).toBe(5);
  });

  it("ignores storage events for other keys and reacts to its own", () => {
    const cb = vi.fn();
    const unsub = subscribeOnboarding(cb);
    window.dispatchEvent(new StorageEvent("storage", { key: "loopan.pantry.v1" }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent("storage", { key: ONBOARDING_KEY }));
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
  });
});
