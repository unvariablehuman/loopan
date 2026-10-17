import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetOnboardingStoreForTests, getOnboardingSnapshot } from "@/lib/onboarding-store";
import { PROFILE_KEY } from "@/lib/profile";
import { __resetProfileStoreForTests } from "@/lib/profile-store";

import { Route as SignupRoute } from "@/routes/signup";

const Signup = SignupRoute.options.component!;

function renderSignup(initialPath = "/signup") {
  const rootRoute = createRootRoute({ component: () => <Signup /> });
  const paths = ["/", "/welcome", "/login", "/signup"];
  const children = paths.map((p) =>
    createRoute({ getParentRoute: () => rootRoute, path: p, component: () => null }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  const navigate = vi.spyOn(router, "navigate");
  render(<RouterProvider router={router} />);
  return { navigate };
}

const PASSWORD = "rahasia-sentinel-123";

function storageHasValueContaining(needle: string): boolean {
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key === null) continue;
    const val = window.localStorage.getItem(key);
    if (val !== null && val.includes(needle)) return true;
  }
  return false;
}

async function fillValid(overrides: Partial<Record<string, string>> = {}) {
  await screen.findByLabelText("Nama");
  const values: Record<string, string> = {
    Nama: "Dewi",
    Email: "dewi@contoh.id",
    "Kata sandi": PASSWORD,
    "Konfirmasi kata sandi": PASSWORD,
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

beforeEach(() => {
  window.localStorage.clear();
  __resetOnboardingStoreForTests();
  __resetProfileStoreForTests();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  __resetOnboardingStoreForTests();
  __resetProfileStoreForTests();
});

describe("signup form validation", () => {
  it("blocks submit and shows all required Indonesian errors when empty", async () => {
    renderSignup();
    await screen.findByLabelText("Nama");
    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));
    expect(screen.getByText("Masukkan nama")).toBeInTheDocument();
    expect(screen.getByText("Masukkan email")).toBeInTheDocument();
    expect(screen.getByText("Masukkan kata sandi")).toBeInTheDocument();
    expect(screen.getByText("Ulangi kata sandi")).toBeInTheDocument();
    expect(getOnboardingSnapshot().entered).toBe(false);
  });

  it("rejects an invalid email", async () => {
    renderSignup();
    await fillValid({ Email: "nope" });
    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));
    expect(screen.getByText("Format email tidak valid")).toBeInTheDocument();
    expect(getOnboardingSnapshot().entered).toBe(false);
  });

  it("rejects a too-short password", async () => {
    renderSignup();
    await fillValid({ "Kata sandi": "123", "Konfirmasi kata sandi": "123" });
    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));
    expect(screen.getByText("Kata sandi minimal 6 karakter")).toBeInTheDocument();
    expect(getOnboardingSnapshot().entered).toBe(false);
  });

  it("rejects a mismatched confirmation", async () => {
    renderSignup();
    await fillValid({ "Konfirmasi kata sandi": "berbeda-sekali" });
    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));
    expect(screen.getByText("Konfirmasi kata sandi tidak cocok")).toBeInTheDocument();
    expect(getOnboardingSnapshot().entered).toBe(false);
  });
});

describe("signup password visibility toggle", () => {
  it("flips the input type and aria-pressed", async () => {
    renderSignup();
    const password = await screen.findByLabelText("Kata sandi");
    expect(password).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Tampilkan kata sandi" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Sembunyikan kata sandi" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("signup valid submit", () => {
  it("shows the simulation note, sets the signup flag, updates the profile name, navigates, and never stores the password", async () => {
    const { navigate } = renderSignup();
    // The non-deceptive simulation note is present.
    expect(await screen.findByText(/pendaftaran hanya simulasi/i, { exact: false })).toBeInTheDocument();

    await fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));

    expect(getOnboardingSnapshot()).toEqual({ entered: true, mode: "signup" });
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/", replace: true }));

    // Optional profile name is reused for display only.
    const profile = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "null");
    expect(profile?.name).toBe("Dewi");

    // The password must never be persisted anywhere.
    expect(storageHasValueContaining(PASSWORD)).toBe(false);
  });
});
