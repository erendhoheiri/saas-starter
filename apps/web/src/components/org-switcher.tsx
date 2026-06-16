import { authClient } from "@/lib/auth"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useOrg } from "@/hooks/useOrg"

export function OrgSwitcher() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useOrg()

  const { data: orgsData } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: async () => {
      // authClient.organization.list() maps to /organization/list (Better Auth path-to-object).
      const result = await (authClient.organization as any).list()
      return (result.data ?? []) as any[]
    },
  })

  const handleSwitchOrg = async (orgId: string) => {
    // authClient.organization.setActive() maps to /organization/set-active.
    await (authClient.organization as any).setActive({ organizationId: orgId })
    // Invalidate all queries so org-scoped data refreshes.
    queryClient.invalidateQueries()
  }

  const label = activeOrg?.name ?? "Organization"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {label} <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {orgsData?.map((org: any) => (
          <DropdownMenuItem key={org.id} onClick={() => handleSwitchOrg(org.id)}>
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
