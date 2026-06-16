import { createRoute } from "@tanstack/react-router"
import { appLayoutRoute } from "@/routes/_app"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Your application is ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Build your core feature here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
