import { Badge, Card, CardContent } from "@starter/ui";
import { createRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  type LucideIcon,
  Settings,
  Sparkles,
} from "lucide-react";
import { appLayoutRoute } from "@/app/app-layout";
import { Page } from "@/components/page";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
});

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const QUICK_ACTIONS: {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    to: "/org",
    title: "Organization",
    description: "Manage members and invitations",
    icon: Building2,
  },
  {
    to: "/settings",
    title: "Settings",
    description: "Update your profile and account",
    icon: Settings,
  },
];

const STEPS = [
  "Update your profile from the settings page",
  "Invite teammates to your organization",
  "Configure your workspace preferences",
];

function DashboardPage() {
  const { user } = useAuth();

  return (
    <Page>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greetingFor(new Date())}, {user?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUICK_ACTIONS.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
              <CardContent className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{title}</p>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-medium text-foreground">Getting started</h2>
            <Badge variant="secondary" className="ml-auto">
              v1.0.0
            </Badge>
          </div>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </Page>
  );
}
