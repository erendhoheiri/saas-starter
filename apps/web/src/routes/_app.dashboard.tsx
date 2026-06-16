import { createRoute } from "@tanstack/react-router"
import { appLayoutRoute } from "@/routes/_app"

export const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground">Build your core feature here.</p>
    </div>
  )
}
