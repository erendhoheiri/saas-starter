import { z } from "zod";

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member"]),
  organizationId: z.string().optional(),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["owner", "admin", "member"]),
  organizationId: z.string().optional(),
});

export const removeMemberSchema = z.object({
  memberIdOrEmail: z.string().min(1),
  organizationId: z.string().optional(),
});

export const acceptInvitationSchema = z.object({
  invitationId: z.string().min(1),
});

export const setActiveOrgSchema = z.object({
  organizationId: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Account schemas
// ---------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  image: z.string().url().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type SetActiveOrgInput = z.infer<typeof setActiveOrgSchema>;
