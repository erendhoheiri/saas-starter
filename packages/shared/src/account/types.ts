/** Current user's own profile, as returned by GET /account/me. */
export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role?: string;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/** One organization's slice of a user-data export. */
export interface OrgEntry {
  org: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    metadata: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  role: string;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    createdAt: Date;
  }>;
}

/** Full user-data export bundle (GET /account/export). */
export interface UserExport {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  orgs: OrgEntry[];
}
