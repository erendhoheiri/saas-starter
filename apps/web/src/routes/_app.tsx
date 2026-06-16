import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { Nav } from "@/components/nav";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/router";

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
    <div className="min-h-screen flex flex-col bg-muted text-foreground">
      <Nav />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
