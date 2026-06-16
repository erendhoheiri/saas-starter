import { createRoute } from "@tanstack/react-router"
import { appLayoutRoute } from "@/routes/_app"

export const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground">Settings page coming soon.</p>
    </div>
  )
}
