import { createRoute } from "@tanstack/react-router"
import { rootRoute } from "@/router"

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-muted-foreground">Signup page coming soon.</p>
      </div>
    </div>
  )
}
