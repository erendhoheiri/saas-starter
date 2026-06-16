import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/_admin"

export const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/users",
  component: AdminUsersPage,
})

function AdminUsersPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Admin — Users</h1>
      <p className="text-muted-foreground">User management coming soon.</p>
    </div>
  )
}
