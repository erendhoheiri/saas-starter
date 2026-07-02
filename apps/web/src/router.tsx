import { createRouter } from "@tanstack/react-router";
import { appLayoutRoute } from "@/app/app-layout";
import { forbiddenRoute } from "@/app/forbidden";
import { indexRoute } from "@/app/index-route";
import { settingsRoute } from "@/features/account/routes/settings";
import { adminLayoutRoute } from "@/features/admin/routes/admin-layout";
import { adminOrgsRoute } from "@/features/admin/routes/orgs";
import { adminUsersRoute } from "@/features/admin/routes/users";
import { forgotPasswordRoute } from "@/features/auth/routes/forgot-password";
import { loginRoute } from "@/features/auth/routes/login";
import { resetPasswordRoute } from "@/features/auth/routes/reset-password";
import { signupRoute } from "@/features/auth/routes/signup";
import { verifyEmailRoute } from "@/features/auth/routes/verify-email";
import { dashboardRoute } from "@/features/dashboard/routes/dashboard";
import { orgRoute } from "@/features/organization/routes/organization";
import { rootRoute } from "@/root-route";

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
