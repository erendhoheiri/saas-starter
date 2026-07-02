import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { authClient } from "@/lib/auth";

export interface Org {
  id: string;
  name: string;
  slug?: string;
}

/** The user's organizations (Better Auth `organization.list`). */
export function useOrgs() {
  return useQuery({
    queryKey: ["my-orgs"],
    queryFn: async (): Promise<Org[]> => {
      const result = await authClient.organization.list();
      const data = result.data;
      return Array.isArray(data) ? (data as Org[]) : [];
    },
  });
}

/** The currently active organization, resolved from the session. */
export function useOrg() {
  const { activeOrganizationId } = useAuth();
  const { data: orgs } = useOrgs();

  return useQuery({
    queryKey: ["org", activeOrganizationId],
    queryFn: async (): Promise<Org | null> => {
      if (!activeOrganizationId) return null;
      const list = orgs ?? (await authClient.organization.list()).data ?? [];
      return (list as Org[]).find((o) => o.id === activeOrganizationId) ?? null;
    },
    enabled: !!activeOrganizationId,
  });
}
