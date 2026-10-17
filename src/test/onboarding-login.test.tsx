import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ONBOARDING_KEY } from "@/lib/onboarding";
import { __resetOnboardingStoreForTests, getOnboardingSnapshot } from "@/lib/onboarding-store";

import { Route as LoginRoute } from "@/routes/login";
import { Route as WelcomeRoute } from "@/routes/welcome";

const Login = LoginRoute.options.component!;
const Welcome = WelcomeRoute.options.component!;

const PANTRY_KEY = "loopan.pantry.v1";

// Render a bare onboarding component inside an in-memory router so its TanStack <Link>s and
// router.navigate resolve. The router's navigate is spied so we can assert destinations without
// a full route tree.
function renderOnboarding(ui: React.ReactNode, initialPath = "/login") {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> });
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

const PASSWORD = "sup3rsecret-sentinel";

function storageHasValueContaining(needle: string): boolean {
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key === null) continue;
    const val = window.localStorage.getItem(key);
    if (val !== null && (val.includes(needle) || key.includes(needle))) return true;
  }
  return false;
}

beforeEach(() => {
  window.localStorage.clear();
  __resetOnboardingStoreForTests();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  __resetOnboardingStoreForTests();
});

describe("login form validation", () => {
  it("blocks submit and shows Indonesian errors when empty", async () => {
    renderOnboarding(<Login />);
    const email = await screen.findByLabelText("Email");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByText("Masukkan email")).toBeInTheDocument();
    expect(screen.getByText("Masukkan kata sandi")).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    // Flag stays unset.
    expect(getOnboardingSnapshot().entered).toBe(false);
  });

  it("rejects an invalid email and a too-short password", async () => {
    renderOnboarding(<Login />);
    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByText("Format email tidak valid")).toBeInTheDocument();
    expect(screen.getByText("Kata sandi minimal 6 karakter")).toBeInTheDocument();
    expect(getOnboardingSnapshot().entered).toBe(false);
  });
});

describe("login password visibility toggle", () => {
  it("flips the input type and aria-pressed", async () => {
    renderOnboarding(<Login />);
    const password = await screen.findByLabelText("Kata sandi");
    expect(password).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Tampilkan kata sandi" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Sembunyikan kata sandi" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
  });
});

describe("login valid submit", () => {
  it("sets the login flag, navigates to / and never writes the password", async () => {
    const { navigate } = renderOnboarding(<Login />);
    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "aku@contoh.id" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    expect(getOnboardingSnapshot()).toEqual({ entered: true, mode: "login" });
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/", replace: true }));
    // The password must never be persisted anywhere.
    expect(storageHasValueContaining(PASSWORD)).toBe(false);
    expect(storageHasValueContaining("aku@contoh.id")).toBe(false);
  });
});

describe("Coba Demo", () => {
  it("sets the demo flag, navigates to / and leaves the pantry key untouched", async () => {
    const sentinel = JSON.stringify([{ id: "sentinel-item" }]);
    window.localStorage.setItem(PANTRY_KEY, sentinel);

    const { navigate } = renderOnboarding(<Welcome />, "/welcome");
    fireEvent.click(await screen.findByRole("button", { name: /Coba Demo/ }));

    expect(getOnboardingSnapshot()).toEqual({ entered: true, mode: "demo" });
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/", replace: true }));
    // The pantry data is never read, cleared or reset by the demo entry.
    expect(window.localStorage.getItem(PANTRY_KEY)).toBe(sentinel);
  });
});
