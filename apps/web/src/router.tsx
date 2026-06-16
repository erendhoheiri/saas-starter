import { createRootRoute, createRouter, Outlet } from "@tanstack/react-router";

// Root route — exported so child routes can reference it
export const rootRoute = createRootRoute({
  component: Outlet,
});

import { adminLayoutRoute } from "@/routes/_admin";
import { adminOrgsRoute } from "@/routes/_admin.orgs";
import { adminUsersRoute } from "@/routes/_admin.users";
import { appLayoutRoute } from "@/routes/_app";
import { dashboardRoute } from "@/routes/_app.dashboard";
import { orgRoute } from "@/routes/_app.org";
import { settingsRoute } from "@/routes/_app.settings";
import { forbiddenRoute } from "@/routes/403";
import { forgotPasswordRoute } from "@/routes/forgot-password";
// Import routes after rootRoute is defined to avoid circular dependency issues
import { indexRoute } from "@/routes/index";
import { loginRoute } from "@/routes/login";
import { resetPasswordRoute } from "@/routes/reset-password";
import { signupRoute } from "@/routes/signup";
import { verifyEmailRoute } from "@/routes/verify-email";

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  forbiddenRoute,
  appLayoutRoute.addChildren([dashboardRoute, settingsRoute, orgRoute]),
  adminLayoutRoute.addChildren([adminUsersRoute, adminOrgsRoute]),
]);

export const router = createRouter({ routeTree });

// Register router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
