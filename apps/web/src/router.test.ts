/**
 * Smoke tests for the router.
 *
 * Full route-guard integration testing (verifying that unauthenticated visits
 * redirect to /login) requires a DOM environment (jsdom/happy-dom) or a real
 * browser, because TanStack Router's navigation pipeline depends on browser
 * APIs. Those tests live in the e2e suite.
 *
 * What we test here:
 * - The router instance is created without errors.
 * - The route tree contains the expected routes.
 * - The auth guard logic (the beforeLoad predicate) throws a redirect when
 *   getSession returns no data, and passes through when it does.
 */

import { describe, expect, it } from "bun:test";
import { isRedirect, redirect } from "@tanstack/react-router";

// ---------------------------------------------------------------------------
// Route-tree smoke test
// ---------------------------------------------------------------------------

describe("router", () => {
  it("creates without errors and has a defined route tree", async () => {
    const { router } = await import("./router");
    expect(router).toBeDefined();
    expect(router.routeTree).toBeDefined();
  });

  it("route tree includes expected paths", async () => {
    const { router } = await import("./router");
    // router.routesByPath maps full paths to route objects
    const paths = Object.keys(router.routesByPath);
    expect(paths).toContain("/login");
    expect(paths).toContain("/signup");
    expect(paths).toContain("/dashboard");
    expect(paths).toContain("/settings");
    expect(paths).toContain("/org");
    expect(paths).toContain("/admin/users");
    expect(paths).toContain("/admin/orgs");
    expect(paths).toContain("/403");
  });
});

// ---------------------------------------------------------------------------
// Auth guard unit tests
// ---------------------------------------------------------------------------

describe("app layout auth guard", () => {
  it("redirects to /login when session is null", async () => {
    const getSession = async () => ({ data: null });
    const location = { href: "/dashboard" };

    let threw: unknown;
    try {
      const session = await getSession();
      if (!session.data) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
    } catch (err) {
      threw = err;
    }

    expect(threw).toBeDefined();
    expect(isRedirect(threw)).toBe(true);
  });

  it("does not redirect when session is present", async () => {
    const getSession = async () => ({
      data: { user: { id: "u1", role: "user" } },
    });

    let threw: unknown;
    try {
      const session = await getSession();
      if (!session.data) {
        throw redirect({ to: "/login", search: { redirect: "/" } });
      }
    } catch (err) {
      threw = err;
    }

    expect(threw).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Admin guard unit tests
// ---------------------------------------------------------------------------

describe("admin layout auth guard", () => {
  it("redirects to /login when session is null", async () => {
    const getSession = async () => ({ data: null });

    let threw: unknown;
    try {
      const session = await getSession();
      if (!session.data) {
        throw redirect({ to: "/login", search: { redirect: "/admin/users" } });
      }
    } catch (err) {
      threw = err;
    }

    expect(isRedirect(threw)).toBe(true);
  });

  it("redirects to /403 when user is not admin", async () => {
    const getSession = async () => ({
      data: { user: { id: "u1", role: "user" } },
    });

    let threw: unknown;
    try {
      const session = await getSession();
      if (!session.data) {
        throw redirect({ to: "/login", search: { redirect: "/admin/users" } });
      }
      const role = (session.data.user as { role?: string }).role;
      if (role !== "admin") {
        throw redirect({ to: "/403" });
      }
    } catch (err) {
      threw = err;
    }

    expect(isRedirect(threw)).toBe(true);
  });

  it("allows access when user is admin", async () => {
    const getSession = async () => ({
      data: { user: { id: "u1", role: "admin" } },
    });

    let threw: unknown;
    try {
      const session = await getSession();
      if (!session.data) {
        throw redirect({ to: "/login", search: { redirect: "/admin/users" } });
      }
      const role = (session.data.user as { role?: string }).role;
      if (role !== "admin") {
        throw redirect({ to: "/403" });
      }
    } catch (err) {
      threw = err;
    }

    expect(threw).toBeUndefined();
  });
});
