import { Button } from "@starter/ui";
import { createRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { rootRoute } from "@/root-route";

export const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/403",
  component: ForbiddenPage,
});

function ForbiddenPage() {
  return (
    <div className="bg-grid flex min-h-screen flex-col items-center justify-center gap-6 bg-muted px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground shadow-xs">
        <Lock className="size-6" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Error 403
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Access denied
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don&apos;t have permission to view this page. If you think this is
          a mistake, contact an administrator.
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
