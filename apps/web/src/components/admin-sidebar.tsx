import { Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Users } from "lucide-react";

const ADMIN_NAV = [
  { to: "/admin/users" as const, label: "Users", icon: Users },
  { to: "/admin/orgs" as const, label: "Organizations", icon: Building2 },
];

export function AdminSidebar() {
  return (
    <aside className="w-60 shrink-0 bg-background border-r border-border flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-border gap-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to app
        </Link>
      </div>

      {/* Section label */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Admin
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
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
    </aside>
  );
}
