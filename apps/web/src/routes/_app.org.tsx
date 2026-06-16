import { createRoute, useNavigate } from "@tanstack/react-router";
import { api as _api } from "@/lib/api";
import { authClient, useSession } from "@/lib/auth";
import { appLayoutRoute } from "@/routes/_app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// biome-ignore lint/suspicious/noExplicitAny: intentional
const api = _api as any;

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@starter/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  Loader2,
  Mail,
  MailPlus,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useOrg } from "@/hooks/useOrg";
import { queryClient } from "@/lib/query";

export const orgRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/org",
  component: OrgPage,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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

  // ---- Members query ----
  const { data: membersData } = useQuery({
    queryKey: ["org", "members", orgId],
    queryFn: async () => {
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
    control: inviteControl,
    formState: { errors: inviteErrors, isSubmitting: inviteSubmitting },
    reset: resetInvite,
    setError: setInviteError,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "member" },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
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
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Organization
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No active organization. Switch to one using the org switcher.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      {/* Org header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {activeOrg?.name}
          </h1>
          <p className="text-sm text-muted-foreground">Organization</p>
        </div>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-foreground" />
            <CardTitle className="text-foreground">Members</CardTitle>
          </div>
          <CardDescription>People in your organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {members.length === 0 && (
            <p className="text-muted-foreground text-sm">No members found.</p>
          )}
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {m.user?.name ? getInitials(m.user.name) : "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.user?.name ?? m.userId}
                    {m.userId === currentUserId && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                  {m.role}
                </Badge>
                {canManage && m.userId !== currentUserId && (
                  <>
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
                      <UserMinus className="h-3.5 w-3.5 shrink-0" />
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite form */}
      {canManage && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-foreground" />
              <CardTitle className="text-foreground">Invite member</CardTitle>
            </div>
            <CardDescription>Send an invitation by email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleInviteSubmit(onInviteSubmit)}
              className="space-y-5"
            >
              <div className="space-y-2.5">
                <Label htmlFor="invite-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    className="pl-10"
                    {...registerInvite("email")}
                  />
                </div>
                {inviteErrors.email && (
                  <p className="text-destructive text-sm">
                    {inviteErrors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2.5">
                <Label>Role</Label>
                <Controller
                  name="role"
                  control={inviteControl}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {inviteErrors.root && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-destructive text-sm">
                    {inviteErrors.root.message}
                  </p>
                </div>
              )}

              {inviteMutation.isSuccess && (
                <div className="rounded-md bg-success/10 p-3">
                  <p className="text-success text-sm">Invitation sent.</p>
                </div>
              )}

              <Button
                type="submit"
                variant="default"
                disabled={inviteSubmitting || inviteMutation.isPending}
                className="gap-2"
              >
                {inviteMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <MailPlus className="h-4 w-4 shrink-0" />
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
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-foreground" />
              <CardTitle className="text-foreground">
                Organization settings
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOrgSubmit(onOrgSubmit)} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="org-name">Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="org-name"
                    className="pl-10"
                    {...registerOrg("name")}
                    placeholder="Organization name"
                  />
                </div>
                {orgErrors.name && (
                  <p className="text-destructive text-sm mt-1">
                    {orgErrors.name.message}
                  </p>
                )}
              </div>

              {orgErrors.root && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-destructive text-sm">
                    {orgErrors.root.message}
                  </p>
                </div>
              )}

              {updateOrgMutation.isSuccess && (
                <div className="rounded-md bg-success/10 p-3">
                  <p className="text-success text-sm">Organization updated.</p>
                </div>
              )}

              <Button
                type="submit"
                variant="default"
                disabled={orgSubmitting || updateOrgMutation.isPending}
              >
                {updateOrgMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
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
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <CardTitle className="text-destructive">Danger zone</CardTitle>
            </div>
            <CardDescription>
              Permanently delete this organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setDeleteOrgOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
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
            className="space-y-4"
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
                className="gap-2"
              >
                {deleteOrgMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
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
