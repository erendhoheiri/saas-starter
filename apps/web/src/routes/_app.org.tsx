import { createRoute, useNavigate } from "@tanstack/react-router";
import { api as _api } from "@/lib/api";
import { authClient, useSession } from "@/lib/auth";
import { appLayoutRoute } from "@/routes/_app";

// TODO: Hono RPC client types require `as any` due to composite build resolution
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = _api as any;

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/hooks/useOrg";
import { queryClient } from "@/lib/query";

export const orgRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/org",
  component: OrgPage,
});

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "member"]),
});
type InviteForm = z.infer<typeof inviteSchema>;

const updateOrgSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
});
type UpdateOrgForm = z.infer<typeof updateOrgSchema>;

const deleteOrgSchema = z.object({
  confirm: z.string().refine((v) => v === "delete organization", {
    message: 'Type "delete organization" to confirm',
  }),
});
type DeleteOrgForm = { confirm: string };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function OrgPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const currentUserId = (session as any)?.user?.id as string | undefined;

  const { data: activeOrg } = useOrg();
  const orgId = activeOrg?.id as string | undefined;

  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);

  // ---- Members query (via Better Auth client) ----
  const { data: membersData } = useQuery({
    queryKey: ["org", "members", orgId],
    queryFn: async () => {
      // Better Auth organizationClient exposes getFullOrganization which
      // includes members in the response.
      const result = await (authClient.organization as any).getFullOrganization(
        {
          query: { organizationId: orgId },
        },
      );
      return result.data as {
        id: string;
        name: string;
        members: Array<{
          id: string;
          userId: string;
          role: string;
          user: { name: string; email: string };
        }>;
      } | null;
    },
    enabled: !!orgId,
  });

  const members = membersData?.members ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const currentRole = currentMember?.role ?? null;
  const canManage = currentRole === "owner" || currentRole === "admin";

  // ---- Invite member ----
  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    formState: { errors: inviteErrors, isSubmitting: inviteSubmitting },
    reset: resetInvite,
    setError: setInviteError,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "member" },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
      // Use the RPC client to POST /api/organizations/invite
      // orgMiddleware uses activeOrganizationId from session — set that first.
      const res = await api.api.organizations.invite.$post({
        json: { email: data.email, role: data.role, organizationId: orgId },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? "Invite failed");
      }
      return res.json();
    },
    onSuccess: () => {
      resetInvite();
      queryClient.invalidateQueries({ queryKey: ["org", "members", orgId] });
    },
  });

  const onInviteSubmit = async (data: InviteForm) => {
    try {
      await inviteMutation.mutateAsync(data);
    } catch (e) {
      setInviteError("root", { message: (e as Error).message });
    }
  };

  // ---- Change role ----
  const changeRoleMutation = useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: string;
    }) => {
      const res = await api.api.organizations.members.role.$post({
        json: { memberId, role, organizationId: orgId },
      });
      if (!res.ok) throw new Error("Failed to change role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "members", orgId] });
    },
  });

  // ---- Remove member ----
  const removeMemberMutation = useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const res = await api.api.organizations.members.remove.$post({
        json: { memberIdOrEmail, organizationId: orgId },
      });
      if (!res.ok) throw new Error("Failed to remove member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "members", orgId] });
    },
  });

  // ---- Update org name ----
  const {
    register: registerOrg,
    handleSubmit: handleOrgSubmit,
    formState: { errors: orgErrors, isSubmitting: orgSubmitting },
    setError: setOrgError,
  } = useForm<UpdateOrgForm>({
    resolver: zodResolver(updateOrgSchema),
    values: { name: activeOrg?.name ?? "" },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async (data: UpdateOrgForm) => {
      // Better Auth client: updateOrganization
      const result = await (authClient.organization as any).update({
        organizationId: orgId,
        data: { name: data.name },
      });
      if (result.error)
        throw new Error(result.error.message ?? "Failed to update");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", orgId] });
    },
  });

  const onOrgSubmit = async (data: UpdateOrgForm) => {
    try {
      await updateOrgMutation.mutateAsync(data);
    } catch (e) {
      setOrgError("root", { message: (e as Error).message });
    }
  };

  // ---- Delete org ----
  const {
    register: registerDeleteOrg,
    handleSubmit: handleDeleteOrgSubmit,
    formState: { errors: deleteOrgErrors, isSubmitting: deleteOrgSubmitting },
    reset: resetDeleteOrg,
  } = useForm<DeleteOrgForm>({
    resolver: zodResolver(deleteOrgSchema),
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No active org");
      // Use account router: DELETE /api/account/orgs/:orgId (owner only)
      const res = await api.api.account.orgs[":orgId"].$delete({
        param: { orgId },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? "Failed to delete organization");
      }
      return res.json();
    },
    onSuccess: () => {
      setDeleteOrgOpen(false);
      resetDeleteOrg();
      queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
  });

  const onDeleteOrgSubmit = async () => {
    try {
      await deleteOrgMutation.mutateAsync();
    } catch {
      // Error is already in deleteOrgMutation.error
    }
  };

  if (!orgId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Organization</h1>
        <p className="text-muted-foreground">
          No active organization. Switch to one using the org switcher.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Organization</h1>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People in your organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 && (
            <p className="text-muted-foreground text-sm">No members found.</p>
          )}
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 py-1"
            >
              <div>
                <p className="text-sm font-medium">
                  {m.user?.name ?? m.userId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.user?.email} · {m.role}
                </p>
              </div>
              {canManage && m.userId !== currentUserId && (
                <div className="flex gap-2">
                  {/* Role toggle (cycle between member/admin for simplicity) */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={changeRoleMutation.isPending}
                    onClick={() =>
                      changeRoleMutation.mutate({
                        memberId: m.id,
                        role: m.role === "member" ? "admin" : "member",
                      })
                    }
                  >
                    Make {m.role === "member" ? "admin" : "member"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={removeMemberMutation.isPending}
                    onClick={() => removeMemberMutation.mutate(m.userId)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite form */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invite member</CardTitle>
            <CardDescription>Send an invitation by email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleInviteSubmit(onInviteSubmit)}
              className="space-y-3"
            >
              <Input
                type="email"
                placeholder="Email address"
                {...registerInvite("email")}
              />
              {inviteErrors.email && (
                <p className="text-destructive text-sm">
                  {inviteErrors.email.message}
                </p>
              )}
              <select
                {...registerInvite("role")}
                className="border rounded-md px-3 h-9 text-sm w-full bg-background"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              {inviteErrors.root && (
                <p className="text-destructive text-sm">
                  {inviteErrors.root.message}
                </p>
              )}
              {inviteMutation.isSuccess && (
                <p className="text-green-600 text-sm">Invitation sent.</p>
              )}
              <Button
                type="submit"
                disabled={inviteSubmitting || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Sending..." : "Send invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Org settings (owner only) */}
      {currentRole === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle>Organization settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOrgSubmit(onOrgSubmit)} className="space-y-3">
              <div>
                <label
                  htmlFor="org-name"
                  className="text-sm font-medium block mb-1"
                >
                  Name
                </label>
                <Input
                  id="org-name"
                  {...registerOrg("name")}
                  placeholder="Organization name"
                />
                {orgErrors.name && (
                  <p className="text-destructive text-sm mt-1">
                    {orgErrors.name.message}
                  </p>
                )}
              </div>
              {orgErrors.root && (
                <p className="text-destructive text-sm">
                  {orgErrors.root.message}
                </p>
              )}
              {updateOrgMutation.isSuccess && (
                <p className="text-green-600 text-sm">Organization updated.</p>
              )}
              <Button
                type="submit"
                disabled={orgSubmitting || updateOrgMutation.isPending}
              >
                {updateOrgMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Delete org (owner only) */}
      {currentRole === "owner" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete this organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setDeleteOrgOpen(true)}
            >
              Delete organization
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete org dialog */}
      <Dialog
        open={deleteOrgOpen}
        onOpenChange={(open) => {
          setDeleteOrgOpen(open);
          if (!open) resetDeleteOrg();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{activeOrg?.name}</strong>{" "}
              and all its data. To confirm, type{" "}
              <strong>delete organization</strong> below.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleDeleteOrgSubmit(onDeleteOrgSubmit)}
            className="space-y-4 mt-2"
          >
            <Input
              {...registerDeleteOrg("confirm")}
              placeholder="delete organization"
              autoComplete="off"
            />
            {deleteOrgErrors.confirm && (
              <p className="text-destructive text-sm">
                {deleteOrgErrors.confirm.message}
              </p>
            )}
            {deleteOrgMutation.isError && (
              <p className="text-destructive text-sm">
                {(deleteOrgMutation.error as Error).message}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteOrgOpen(false);
                  resetDeleteOrg();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteOrgSubmitting || deleteOrgMutation.isPending}
              >
                {deleteOrgMutation.isPending
                  ? "Deleting..."
                  : "Delete organization"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
