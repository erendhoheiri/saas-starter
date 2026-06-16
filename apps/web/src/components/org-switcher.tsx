import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@starter/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useRef, useState } from "react";
import { useOrg } from "@/hooks/useOrg";
import { authClient } from "@/lib/auth";

export function OrgSwitcher({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { data: activeOrg } = useOrg();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const { data: orgsData } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: async () => {
      const result = await (authClient.organization as any).list();
      const data = result?.data;
      if (Array.isArray(data)) return data as any[];
      if (data && typeof data === "object") return Object.values(data) as any[];
      return [] as any[];
    },
  });

  const handleSwitchOrg = async (orgId: string) => {
    await (authClient.organization as any).setActive({ organizationId: orgId });
    queryClient.invalidateQueries();
  };

  const orgs = orgsData ?? [];
  const label = activeOrg?.name ?? "No org";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          ref={triggerRef}
          className={cn(
            "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
            className,
          )}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">{label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 transition-transform data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="center"
        sideOffset={6}
        className="min-w-56"
        style={
          triggerRef.current
            ? { width: triggerRef.current.offsetWidth }
            : undefined
        }
      >
        {orgs.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            No organizations
          </p>
        )}
        {orgs.map((org: any) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchOrg(org.id)}
            className="flex items-center gap-3"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[10px] font-semibold text-accent-foreground">
              {org.name?.charAt(0)?.toUpperCase() ?? "O"}
            </div>
            <span className="flex-1 truncate text-popover-foreground">
              {org.name}
            </span>
            {org.id === activeOrg?.id && (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
