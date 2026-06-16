import { createRoute, Outlet, redirect } from "@tanstack/react-router"
import { rootRoute } from "@/router"
import { authClient } from "@/lib/auth"
import { Nav } from "@/components/nav"

export const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
    return { session: session.data }
  },
})

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
