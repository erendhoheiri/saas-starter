import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/_admin"

export const adminOrgsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/orgs",
  component: AdminOrgsPage,
})

function AdminOrgsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Admin — Organizations</h1>
      <p className="text-muted-foreground">Organization management coming soon.</p>
    </div>
  )
}
