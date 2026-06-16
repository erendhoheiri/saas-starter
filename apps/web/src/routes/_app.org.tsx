import { createRoute } from "@tanstack/react-router"
import { appLayoutRoute } from "@/routes/_app"

export const orgRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/org",
  component: OrgPage,
})

function OrgPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Organization</h1>
      <p className="text-muted-foreground">Org management coming soon.</p>
    </div>
  )
}
