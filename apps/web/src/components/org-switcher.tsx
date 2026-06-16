import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrg } from "@/hooks/useOrg";
import { authClient } from "@/lib/auth";

export function OrgSwitcher() {
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
        <Button variant="outline" className="gap-2">
          {label} <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
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
