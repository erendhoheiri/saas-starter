/** A user row in the admin users table. */
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  bannedAt: string | Date | null;
  createdAt: string | Date;
}

/** An organization row in the admin orgs table. */
export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  deletedAt: string | Date | null;
  createdAt: string | Date;
}

/** Generic paginated list envelope returned by admin list endpoints. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
