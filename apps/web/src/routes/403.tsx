import { Button, Card, CardContent, CardHeader, CardTitle } from "@starter/ui";
import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "@/router";

export const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/403",
  component: ForbiddenPage,
});

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-muted">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-5xl font-bold">403</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
