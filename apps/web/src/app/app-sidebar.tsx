import { Building2, LayoutDashboard, Settings } from "lucide-react";
import { type NavItem, NavSidebar } from "@/components/nav-sidebar";
import { UserMenu } from "@/components/user-menu";
import { OrgSwitcher } from "@/features/organization/components/org-switcher";

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/org", label: "Organization", icon: Building2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <NavSidebar
      brand={{ label: "Starter", to: "/dashboard", icon: LayoutDashboard }}
      sectionLabel="Main"
      items={NAV_ITEMS}
      footer={
        <>
          <OrgSwitcher />
          <UserMenu />
        </>
      }
    />
  );
}
