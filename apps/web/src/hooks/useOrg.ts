import { useQuery } from "@tanstack/react-query";
import { authClient, useSession } from "@/lib/auth";

export function useOrg() {
  const { data: session } = useSession();
  // biome-ignore lint/suspicious/noExplicitAny: intentional
  const activeOrgId = (session as any)?.session?.activeOrganizationId as
    | string
    | undefined;

  return useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return null;
      // Fetch all orgs and find the active one.
      // TODO: replace with direct GET /organizations/:orgId once that endpoint exists.
      // authClient.organization.list() maps to /organization/list (Better Auth path-to-object).
      const result = await (authClient.organization as any).list();
      const orgs: any[] = result.data ?? [];
      return orgs.find((o: any) => o.id === activeOrgId) ?? null;
    },
    enabled: !!activeOrgId,
  });
}
