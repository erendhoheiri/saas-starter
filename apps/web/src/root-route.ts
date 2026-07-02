import { createRootRoute, Outlet } from "@tanstack/react-router";

/**
 * The root route lives in its own leaf module (no child imports) so that route
 * files can reference it without importing `router.tsx` — which imports every
 * route. That would form an import cycle and leave `router`/`api` bindings in a
 * temporal dead zone under the test loader.
 */
export const rootRoute = createRootRoute({
  component: Outlet,
});
