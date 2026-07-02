import { z } from "zod";

/** Query params for the admin list endpoints (users, orgs). */
export const adminListQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
