import { useSession } from "@/lib/auth";

/**
 * Application user shape.
 *
 * Better Auth's client-side session type does not include the extra columns
 * the Drizzle adapter passes through (`role`, `bannedAt`) nor is it convenient
 * to reach into `session.session`. This hook narrows the loosely-typed client
 * session into a single strongly-typed accessor so the rest of the app never
 * needs an `as any`.
 */
export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
}

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
