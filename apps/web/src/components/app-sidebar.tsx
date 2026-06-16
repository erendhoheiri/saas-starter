import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { cn } from "@starter/ui";
import { signOut, useSession } from "@/lib/auth";
import { OrgSwitcher } from "./org-switcher";

const NAV_ITEMS = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/settings" as const, label: "Settings", icon: Settings },
  { to: "/org" as const, label: "Organization", icon: Building2 },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppSidebar() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = (session as any)?.user;
  const initials = useMemo(
    () => (user?.name ? getInitials(user.name) : "U"),
    [user?.name],
  );

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
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shadow-xs">
          <span className="text-xs font-bold text-primary-foreground">S</span>
        </div>
        <Link to="/dashboard" className="text-sm font-semibold text-foreground">
          Starter
        </Link>
      </div>

      {/* Navigation */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Main
        </p>
      </div>
      <nav className="flex-1 px-2 pb-2 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              "text-foreground hover:bg-accent hover:text-accent-foreground",
              "data-[status=active]:bg-accent data-[status=active]:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom: org switcher + user */}
      <div className="border-t border-border p-3 space-y-3">
        <OrgSwitcher className="w-full" />
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-none text-foreground">
              {user?.name ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {user?.email ?? "Signed in"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
