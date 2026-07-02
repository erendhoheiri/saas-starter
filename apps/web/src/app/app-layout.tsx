import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/app/app-sidebar";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/root-route";

export const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { session: session.data };
  },
});

function AppLayout() {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1 bg-muted overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
