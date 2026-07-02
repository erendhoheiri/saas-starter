import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@starter/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useOrg, useOrgs } from "@/hooks/useOrg";
import { authClient } from "@/lib/auth";

export function OrgSwitcher({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { data: activeOrg } = useOrg();
  const { data: orgs = [] } = useOrgs();

  const handleSwitchOrg = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId });
    queryClient.invalidateQueries();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm font-medium text-foreground transition-colors",
            "hover:bg-accent data-[state=open]:bg-accent",
            className,
          )}
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
            {activeOrg?.name?.charAt(0)?.toUpperCase() ?? (
              <Building2 className="size-3" />
            )}
          </span>
          <span className="flex-1 truncate text-left">
            {activeOrg?.name ?? "No organization"}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
      >
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {orgs.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            No organizations
          </p>
        )}
        {orgs.length > 0 && <DropdownMenuSeparator />}
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchOrg(org.id)}
            className="gap-2.5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
              {org.name?.charAt(0)?.toUpperCase() ?? "O"}
            </span>
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === activeOrg?.id && (
              <Check className="size-3.5 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
