import { createRoute } from "@tanstack/react-router"
import { rootRoute } from "@/router"

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-muted-foreground">Auth page coming soon.</p>
      </div>
    </div>
  )
}
