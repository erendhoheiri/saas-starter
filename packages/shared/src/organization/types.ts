import type { Role } from "./schema";

/** A minimal organization as exposed to clients. */
export interface Org {
  id: string;
  name: string;
  slug: string;
}

/** An organization member joined with the underlying user. */
export interface Member {
  id: string;
  userId: string;
  role: Role | string;
  user: { name: string; email: string };
}
