import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "@/root-route";
import { adminLayoutRoute } from "@/routes/_admin";
import { adminOrgsRoute } from "@/routes/_admin.orgs";
import { adminUsersRoute } from "@/routes/_admin.users";
import { appLayoutRoute } from "@/routes/_app";
import { dashboardRoute } from "@/routes/_app.dashboard";
import { orgRoute } from "@/routes/_app.org";
import { settingsRoute } from "@/routes/_app.settings";
import { forbiddenRoute } from "@/routes/403";
import { forgotPasswordRoute } from "@/routes/forgot-password";
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
