/**
 * Organization application service.
 *
 * Organizations are managed by Better Auth's server-side organization plugin,
 * so this service is a thin anti-corruption layer over `auth.api.*`: it accepts
 * validated input + the request headers and returns Better Auth's result. HTTP
 * error mapping lives in the route layer.
 */
import type {
  AcceptInvitationInput,
  CreateOrgInput,
  InviteMemberInput,
  RemoveMemberInput,
  SetActiveOrgInput,
  UpdateMemberRoleInput,
} from "@starter/shared";

export async function createOrg(headers: Headers, body: CreateOrgInput) {
  const { auth } = await import("@starter/auth");
  return auth.api.createOrganization({
    body: { name: body.name, slug: body.slug },
    headers,
  });
}

export async function listOrgs(headers: Headers) {
  const { auth } = await import("@starter/auth");
  return auth.api.listOrganizations({ headers });
}

export async function inviteMember(headers: Headers, body: InviteMemberInput) {
  const { auth } = await import("@starter/auth");
  // Better Auth's role type is narrowly inferred from plugin options; the value
  // is already validated by the Zod schema, so we widen the call signature.
  return (
    auth.api.createInvitation as (opts: {
      body: { email: string; role: unknown; organizationId?: string };
      headers: Headers;
    }) => Promise<unknown>
  )({
    body: {
      email: body.email,
      role: body.role,
      organizationId: body.organizationId,
    },
    headers,
  });
}

export async function acceptInvitation(
  headers: Headers,
  body: AcceptInvitationInput,
) {
  const { auth } = await import("@starter/auth");
  return auth.api.acceptInvitation({
    body: { invitationId: body.invitationId },
    headers,
  });
}

export async function updateMemberRole(
  headers: Headers,
  body: UpdateMemberRoleInput,
) {
  const { auth } = await import("@starter/auth");
  return auth.api.updateMemberRole({
    body: {
      memberId: body.memberId,
      role: body.role,
      organizationId: body.organizationId,
    },
    headers,
  });
}

export async function removeMember(headers: Headers, body: RemoveMemberInput) {
  const { auth } = await import("@starter/auth");
  return auth.api.removeMember({
    body: {
      memberIdOrEmail: body.memberIdOrEmail,
      organizationId: body.organizationId,
    },
    headers,
  });
}

export async function setActiveOrg(headers: Headers, body: SetActiveOrgInput) {
  const { auth } = await import("@starter/auth");
  return auth.api.setActiveOrganization({
    body: { organizationId: body.organizationId },
    headers,
  });
}
