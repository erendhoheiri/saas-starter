import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "@/router";

export const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/403",
  component: ForbiddenPage,
});

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">403</h1>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <Link
          to="/dashboard"
          className="text-primary underline underline-offset-4"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
