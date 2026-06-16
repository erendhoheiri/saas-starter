import { createRoute, Outlet, redirect } from "@tanstack/react-router"
import { rootRoute } from "@/router"
import { authClient } from "@/lib/auth"
import { ImpersonationBanner } from "@/components/impersonation-banner"

export const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "admin",
  component: AdminLayout,
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
    const role = (session.data.user as { role?: string }).role
    if (role !== "admin") {
      throw redirect({ to: "/403" })
    }
    return { session: session.data }
  },
})

function AdminLayout() {
  return (
    <div className="min-h-screen">
      <ImpersonationBanner />
      <Outlet />
    </div>
  )
}
