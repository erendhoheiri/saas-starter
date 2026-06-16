import { createRoute, redirect } from "@tanstack/react-router"
import { rootRoute } from "@/router"

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" })
  },
  component: () => null,
})
