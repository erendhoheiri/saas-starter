import { cn } from "@starter/ui";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavSidebarProps {
  brand: {
    label: string;
    to: string;
    icon: LucideIcon;
    /** Brand mark background tone. */
    tone?: "primary" | "destructive";
  };
  /** Optional slot rendered directly under the brand (e.g. "back to app"). */
  topSlot?: ReactNode;
  sectionLabel: string;
  items: NavItem[];
  /** Footer content (org switcher, user menu, …). */
  footer: ReactNode;
}

/**
 * Shared application shell sidebar. The app and admin sidebars are identical in
 * structure — only their brand, nav items and footer differ — so they compose
 * this instead of duplicating layout.
 */
export function NavSidebar({
  brand,
  topSlot,
  sectionLabel,
  items,
  footer,
}: NavSidebarProps) {
  const BrandIcon = brand.icon;
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-background">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-primary-foreground shadow-xs",
            brand.tone === "destructive" ? "bg-destructive" : "bg-primary",
          )}
        >
          <BrandIcon className="size-4" />
        </div>
        <Link
          to={brand.to}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {brand.label}
        </Link>
      </div>

      {topSlot ? <div className="px-2 pt-3">{topSlot}</div> : null}

      {/* Navigation — label inset (px-5 = nav px-2 + item px-3) aligns with item icons */}
      <div className="px-5 pb-1 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {sectionLabel}
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 pb-2">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "data-[status=active]:bg-accent data-[status=active]:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0 transition-colors group-hover:text-foreground data-[status=active]:text-primary" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-border p-3">{footer}</div>
    </aside>
  );
}
