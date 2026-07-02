/** Application user shape shared across client and server boundaries. */
export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
}

/** Narrowed session info the client cares about. */
export interface SessionInfo {
  user: AuthUser | null;
  activeOrganizationId: string | null;
  isImpersonating: boolean;
}
