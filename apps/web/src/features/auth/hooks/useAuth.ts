import type { AuthUser } from "@starter/shared";
import { useSession } from "@/lib/auth";

export type { AuthUser };

/**
 * Narrows Better Auth's loosely-typed client session into a single strongly-
 * typed accessor (adding `role` from the Drizzle adapter) so the rest of the
 * app never needs an `as any`. The `AuthUser` shape is the shared contract.
 */
interface AuthState {
  user: AuthUser | null;
  activeOrganizationId: string | null;
  isImpersonating: boolean;
  isPending: boolean;
}

interface RawSession {
  user?: Partial<AuthUser> & { id: string; email: string };
  session?: {
    activeOrganizationId?: string | null;
    impersonatedBy?: string | null;
  };
}

export function useAuth(): AuthState {
  const { data, isPending } = useSession();
  const raw = (data ?? null) as RawSession | null;
  const rawUser = raw?.user ?? null;

  return {
    user: rawUser
      ? {
          id: rawUser.id,
          name: rawUser.name ?? null,
          email: rawUser.email,
          image: rawUser.image ?? null,
          role: rawUser.role ?? null,
        }
      : null,
    activeOrganizationId: raw?.session?.activeOrganizationId ?? null,
    isImpersonating: !!raw?.session?.impersonatedBy,
    isPending,
  };
}
