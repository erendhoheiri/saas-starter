import { Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Shield, Users } from "lucide-react";
import { type NavItem, NavSidebar } from "./nav-sidebar";
import { UserMenu } from "./user-menu";

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/orgs", label: "Organizations", icon: Building2 },
];

export function AdminSidebar() {
  return (
    <NavSidebar
      brand={{
        label: "Admin",
        to: "/admin/users",
        icon: Shield,
        tone: "destructive",
      }}
      topSlot={
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to app
        </Link>
      }
      sectionLabel="Management"
      items={ADMIN_NAV}
      footer={<UserMenu fallback="A" showSettings={false} />}
    />
  );
}
