import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Outlet,
  createMemoryHistory,
} from "@tanstack/react-router";
import { DoctorPage } from "@/components/doctor-page";

function buildRouter(initialPath: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>Home Page</div>,
  });
  const doctorRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/doctor",
    component: () => <Outlet />,
  });
  const doctorIndex = createRoute({
    getParentRoute: () => doctorRoute,
    path: "/",
    component: DoctorPage,
  });
  const tree = rootRoute.addChildren([indexRoute, doctorRoute.addChildren([doctorIndex])]);
  return createRouter({
    routeTree: tree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

describe("Doctor page navigation", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders the doctor page on initial load at /doctor", async () => {
    const router = buildRouter("/doctor");
    render(<RouterProvider router={router} />);
    // wait for client mount gate
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      await screen.findByRole("heading", { name: /^AI Patient Advocate$/i }),
    ).toBeInTheDocument();
  });

  it("renders the doctor page after navigating from another route", async () => {
    const router = buildRouter("/");
    render(<RouterProvider router={router} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/Home Page/i)).toBeInTheDocument();

    await act(async () => {
      await router.navigate({ to: "/doctor" });
    });

    expect(
      await screen.findByRole("heading", { name: /^AI Patient Advocate$/i }),
    ).toBeInTheDocument();
  });
});
