import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@starter/ui";
import { createRoute, Link } from "@tanstack/react-router";
import { appLayoutRoute } from "@/routes/_app";
import { useSession } from "@/lib/auth";
import { Settings, Users, ArrowRight } from "lucide-react";

export const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
});

function DashboardPage() {
  const { data: session } = useSession();
  const user = (session as any)?.user;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          {greeting}, {user?.name ?? "there"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your workspace.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link to="/settings" className="group block">
          <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Settings</CardTitle>
                  <CardDescription>Manage your profile</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                Open settings <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/org" className="group block">
          <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Organization</CardTitle>
                  <CardDescription>Manage members</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                Manage org <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/dashboard" className="group block">
          <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <div className="h-5 w-5 flex items-center justify-center text-sm font-bold">
                    S
                  </div>
                </div>
                <div>
                  <CardTitle className="text-base">Starter</CardTitle>
                  <CardDescription>v1.0.0</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {user?.email ?? "Signed in"}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Welcome card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Starter</CardTitle>
          <CardDescription>
            Your application is ready and running.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Use the sidebar to navigate between pages or click the cards above
            to jump to specific sections.
          </p>
          <div className="rounded-lg bg-muted p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground mb-2">
              Getting started
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">1</span>
                Explore the <Link to="/settings" className="text-primary hover:underline">settings</Link> to update your profile
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">2</span>
                Invite team members from the <Link to="/org" className="text-primary hover:underline">organization</Link> page
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">3</span>
                Configure your project settings and preferences
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
