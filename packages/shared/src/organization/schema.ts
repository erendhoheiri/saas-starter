import { z } from "zod";

/** Organization membership roles, most→least privileged. */
export const roleSchema = z.enum(["owner", "admin", "member"]);

export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    ),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
  organizationId: z.string().optional(),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: roleSchema,
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

export type Role = z.infer<typeof roleSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type SetActiveOrgInput = z.infer<typeof setActiveOrgSchema>;
