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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@starter/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Loader2,
  Mail,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/fields";
import { Page, PageHeader } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { queryClient } from "@/lib/query";
import { appLayoutRoute } from "@/routes/_app";

export const orgRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/org",
  component: OrgPage,
});

export const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "member"]),
});
type InviteForm = z.infer<typeof inviteSchema>;

const updateOrgSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
});
type UpdateOrgForm = z.infer<typeof updateOrgSchema>;

interface Member {
  id: string;
  userId: string;
  role: string;
  user: { name: string; email: string };
}

const DELETE_PHRASE = "delete organization";

function OrgPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: activeOrg } = useOrg();
  const orgId = activeOrg?.id;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { data: membersData } = useQuery({
    queryKey: ["org", "members", orgId],
    queryFn: async () => {
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      return (result.data ?? null) as { members: Member[] } | null;
    },
    enabled: !!orgId,
  });

  const members = membersData?.members ?? [];
  const currentRole = members.find((m) => m.userId === user?.id)?.role ?? null;
  const canManage = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";

  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: ["org", "members", orgId] });

  // ---- Invite member ----
  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
      const res = await api.api.organizations.invite.$post({
        json: { email: data.email, role: data.role, organizationId: orgId },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Invite failed");
      }
      return res.json();
    },
    onSuccess: () => {
      inviteForm.reset();
      invalidateMembers();
      toast.success("Invitation sent");
    },
    onError: (e) =>
      inviteForm.setError("root", { message: (e as Error).message }),
  });

  // ---- Change role / remove ----
  const changeRole = useMutation({
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
      invalidateMembers();
      toast.success("Role updated");
    },
    onError: () => toast.error("Failed to change role"),
  });

  const removeMember = useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const res = await api.api.organizations.members.remove.$post({
        json: { memberIdOrEmail, organizationId: orgId },
      });
      if (!res.ok) throw new Error("Failed to remove member");
      return res.json();
    },
    onSuccess: () => {
      invalidateMembers();
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  // ---- Update org name ----
  const orgForm = useForm<UpdateOrgForm>({
    resolver: zodResolver(updateOrgSchema),
    values: { name: activeOrg?.name ?? "" },
  });

  const updateOrg = useMutation({
    mutationFn: async (data: UpdateOrgForm) => {
      const result = await authClient.organization.update({
        organizationId: orgId,
        data: { name: data.name },
      });
      if (result.error)
        throw new Error(result.error.message ?? "Failed to update");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org"] });
      queryClient.invalidateQueries({ queryKey: ["my-orgs"] });
      toast.success("Organization updated");
    },
    onError: (e) => orgForm.setError("root", { message: (e as Error).message }),
  });

  // ---- Delete org ----
  const deleteOrg = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No active org");
      const res = await api.api.account.orgs[":orgId"].$delete({
        param: { orgId },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete organization");
      }
      return res.json();
    },
    onSuccess: () => {
      setDeleteOpen(false);
      setConfirmText("");
      queryClient.invalidateQueries();
      toast.success("Organization deleted");
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!orgId) {
    return (
      <Page size="md">
        <PageHeader icon={Building2} title="Organization" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Building2 className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No active organization. Switch to one using the org switcher.
            </p>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page size="md">
      <PageHeader
        icon={Building2}
        title={activeOrg?.name ?? "Organization"}
        description={`${members.length} member${members.length === 1 ? "" : "s"}`}
      />

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <CardTitle>Members</CardTitle>
          </div>
          <CardDescription>People in your organization.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">
              No members found.
            </p>
          )}
          {members.map((m) => {
            const isSelf = m.userId === user?.id;
            return (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <UserAvatar name={m.user?.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.user?.name ?? m.userId}
                    {isSelf && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.user?.email}
                  </p>
                </div>
                <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                  {m.role}
                </Badge>
                {canManage && !isSelf && m.role !== "owner" && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={changeRole.isPending}
                      onClick={() =>
                        changeRole.mutate({
                          memberId: m.id,
                          role: m.role === "member" ? "admin" : "member",
                        })
                      }
                    >
                      Make {m.role === "member" ? "admin" : "member"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${m.user?.name ?? "member"}`}
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate(m.userId)}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Invite */}
      {canManage && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-muted-foreground" />
              <CardTitle>Invite member</CardTitle>
            </div>
            <CardDescription>Send an invitation by email.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...inviteForm}>
              <form
                onSubmit={inviteForm.handleSubmit((d) =>
                  inviteMutation.mutate(d),
                )}
                className="flex flex-col gap-4 sm:flex-row sm:items-start"
              >
                <div className="flex-1">
                  <TextField
                    control={inviteForm.control}
                    name="email"
                    label="Email address"
                    type="email"
                    icon={Mail}
                    placeholder="colleague@example.com"
                  />
                </div>
                <FormField
                  control={inviteForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="sm:w-36">
                      <FormLabel>Role</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="sm:mt-[26px]"
                >
                  {inviteMutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Send invite
                </Button>
              </form>
            </Form>
            {inviteForm.formState.errors.root && (
              <p className="mt-3 text-sm text-destructive">
                {inviteForm.formState.errors.root.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Owner settings */}
      {isOwner && (
        <>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Organization settings</CardTitle>
              <CardDescription>Update your organization name.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...orgForm}>
                <form
                  onSubmit={orgForm.handleSubmit((d) => updateOrg.mutate(d))}
                  className="space-y-4"
                >
                  <TextField
                    control={orgForm.control}
                    name="name"
                    label="Name"
                    icon={Building2}
                    placeholder="Organization name"
                  />
                  <Button type="submit" disabled={updateOrg.isPending}>
                    {updateOrg.isPending && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Save changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="mt-4 border-destructive/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="size-4 text-destructive" />
                <CardTitle className="text-destructive">Danger zone</CardTitle>
              </div>
              <CardDescription>
                Permanently delete this organization and all its data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Delete organization
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{activeOrg?.name}</strong> and
              all its data. To confirm, type <strong>{DELETE_PHRASE}</strong>{" "}
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete-org" className="sr-only">
              Confirmation phrase
            </Label>
            <Input
              id="confirm-delete-org"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={DELETE_PHRASE}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== DELETE_PHRASE || deleteOrg.isPending}
              onClick={() => deleteOrg.mutate()}
            >
              {deleteOrg.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Delete organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
