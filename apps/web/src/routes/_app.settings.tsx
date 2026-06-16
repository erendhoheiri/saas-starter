import { useMemo } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { api as _api } from "@/lib/api";
import { signOut, useSession } from "@/lib/auth";
import { appLayoutRoute } from "@/routes/_app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = _api as any;

import { zodResolver } from "@hookform/resolvers/zod";
import {
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@starter/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Download,
  Loader2,
  Settings,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { queryClient } from "@/lib/query";

export const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: SettingsPage,
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

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

const deleteAccountSchema = z.object({
  confirm: z.string().refine((v) => v === "delete my account", {
    message: 'Type "delete my account" to confirm',
  }),
});

type DeleteAccountForm = { confirm: string };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function SettingsPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = (session as any)?.user;
  const initials = useMemo(
    () => (user?.name ? getInitials(user.name) : "U"),
    [user?.name],
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ---- Profile query ----
  const { data: profile } = useQuery({
    queryKey: ["account", "me"],
    queryFn: async () => {
      const res = await api.api.account.me.$get();
      return res.json() as Promise<{
        id: string;
        name: string;
        email: string;
        image: string | null;
      }>;
    },
    enabled: !!user,
  });

  // ---- Update profile mutation ----
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    values: { name: profile?.name ?? user?.name ?? "" },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileForm) => {
      const res = await api.api.account.me.$patch({ json: data });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "me"] });
    },
  });

  const onProfileSubmit = async (data: UpdateProfileForm) => {
    try {
      await updateProfileMutation.mutateAsync(data);
    } catch {
      setError("root", { message: "Failed to update profile" });
    }
  };

  // ---- Export data ----
  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await api.api.account.export.$get();
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "data-export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  // ---- Delete account mutation ----
  const {
    register: registerDelete,
    handleSubmit: handleDeleteSubmit,
    formState: { errors: deleteErrors, isSubmitting: deleteSubmitting },
    reset: resetDelete,
  } = useForm<DeleteAccountForm>({
    resolver: zodResolver(deleteAccountSchema),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await api.api.account.me.$delete();
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: async () => {
      await signOut();
      navigate({ to: "/login" });
    },
  });

  const onDeleteSubmit = async () => {
    try {
      await deleteAccountMutation.mutateAsync();
    } catch {
      return;
    }
    setDeleteDialogOpen(false);
    resetDelete();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-8">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Settings className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* ---- Profile Tab ---- */}
        <TabsContent value="profile">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {user?.name ?? "User"}
              </p>
              <p className="text-sm text-muted-foreground">
                {profile?.email ?? user?.email ?? "No email"}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Edit profile</CardTitle>
              <CardDescription>Update your display name.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onProfileSubmit)}
                className="space-y-5"
              >
                <div className="space-y-2.5">
                  <Label htmlFor="profile-name">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="profile-name"
                      className="pl-10"
                      placeholder="Your name"
                      {...register("name")}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-destructive text-sm">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {errors.root && (
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-destructive text-sm">
                      {errors.root.message}
                    </p>
                  </div>
                )}

                {updateProfileMutation.isSuccess && (
                  <div className="rounded-md bg-success/10 p-3">
                    <p className="text-success text-sm">Profile updated.</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {updateProfileMutation.isPending
                    ? "Saving..."
                    : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Account Tab ---- */}
        <TabsContent value="account">
          <div className="flex items-center gap-3 mb-6 rounded-lg bg-muted p-4">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="text-foreground font-medium">
                {user?.email ?? "..."}
              </span>
            </p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-foreground" />
                  <CardTitle className="text-foreground">Export data</CardTitle>
                </div>
                <CardDescription>
                  Download a JSON bundle of your account data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 shrink-0 text-foreground" />
                  ) : (
                    <Download className="h-4 w-4 shrink-0 text-foreground" />
                  )}
                  {exportMutation.isPending ? "Exporting..." : "Export my data"}
                </Button>
                {exportMutation.isError && (
                  <p className="text-destructive text-sm mt-2">
                    Export failed. Please try again.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <CardTitle className="text-destructive">
                    Danger zone
                  </CardTitle>
                </div>
                <CardDescription>
                  Permanently delete your account. This cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="inline-flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4 shrink-0 text-white" />
                  Delete account
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) resetDelete();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data.
              To confirm, type <strong>delete my account</strong> below.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleDeleteSubmit(onDeleteSubmit)}
            className="space-y-4"
          >
            <Input
              {...registerDelete("confirm")}
              placeholder="delete my account"
              autoComplete="off"
            />
            {deleteErrors.confirm && (
              <p className="text-destructive text-sm">
                {deleteErrors.confirm.message}
              </p>
            )}
            {deleteAccountMutation.isError && (
              <p className="text-destructive text-sm">
                Failed to delete account. Please try again.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  resetDelete();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteSubmitting || deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending
                  ? "Deleting..."
                  : "Delete account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
