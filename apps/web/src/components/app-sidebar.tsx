import { Button } from "@starter/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { signOut, useSession } from "@/lib/auth";
import { OrgSwitcher } from "./org-switcher";

const NAV_ITEMS = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/settings" as const, label: "Settings", icon: Settings },
  { to: "/org" as const, label: "Organization", icon: Users },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = (session as any)?.user;

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate({ to: "/login" });
    }
  };

  return (
    <aside className="w-60 shrink-0 bg-background border-r border-border flex flex-col">
      {/* Brand */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <Link to="/dashboard" className="text-lg font-bold tracking-tight">
          Starter
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom: org switcher + user */}
      <div className="border-t border-border p-3 space-y-3">
        <OrgSwitcher className="w-full" />
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-none">
              {user?.name ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
