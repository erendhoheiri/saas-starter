import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@starter/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useOrg } from "@/hooks/useOrg";
import { authClient } from "@/lib/auth";

export function OrgSwitcher({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { data: activeOrg } = useOrg();

  const { data: orgsData } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: async () => {
      const result = await (authClient.organization as any).list();
      const data = result?.data;
      if (Array.isArray(data)) return data as any[];
      // Better Auth may return an object keyed by org ID
      if (data && typeof data === "object") return Object.values(data) as any[];
      return [] as any[];
    },
  });

  const handleSwitchOrg = async (orgId: string) => {
    // authClient.organization.setActive() maps to /organization/set-active.
    await (authClient.organization as any).setActive({ organizationId: orgId });
    // Invalidate all queries so org-scoped data refreshes.
    queryClient.invalidateQueries();
  };

  const label = activeOrg?.name ?? "Organization";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("gap-2 justify-between", className)}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {orgsData?.map((org: any) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchOrg(org.id)}
          >
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
