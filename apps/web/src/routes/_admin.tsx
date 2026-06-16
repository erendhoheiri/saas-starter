import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/router";

export const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "admin",
  component: AdminLayout,
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    const role = (session.data.user as { role?: string }).role;
    if (role !== "admin") {
      throw redirect({ to: "/403" });
    }
    return { session: session.data };
  },
});

function AdminLayout() {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col bg-muted overflow-y-auto">
        <ImpersonationBanner />
        <Outlet />
      </div>
    </div>
  );
}
