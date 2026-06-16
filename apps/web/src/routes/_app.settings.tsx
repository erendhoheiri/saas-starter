import { createRoute, useNavigate } from "@tanstack/react-router";
import { api as _api } from "@/lib/api";
import { signOut, useSession } from "@/lib/auth";
import { appLayoutRoute } from "@/routes/_app";

// TODO: Hono RPC client types require `as any` due to composite build resolution
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
} from "@starter/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { queryClient } from "@/lib/query";

export const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: SettingsPage,
});

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "account">("profile");

  // ---- Profile query ----
  const { data: profile } = useQuery({
    queryKey: ["account", "me"],
    queryFn: async () => {
      // TODO: RPC types for account module may require `as any` since the router
      // nested path typing can be tricky with Hono RPC.
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
      // Error is already in deleteAccountMutation.error
      return;
    }
    setDeleteDialogOpen(false);
    resetDelete();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Tab nav */}
      <div className="flex gap-4 border-b pb-2">
        <button
          type="button"
          className={`text-sm font-medium pb-2 ${activeTab === "profile" ? "border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          className={`text-sm font-medium pb-2 ${activeTab === "account" ? "border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("account")}
        >
          Account
        </button>
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your name and avatar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">
              Email:{" "}
              <span className="text-foreground">
                {profile?.email ?? user?.email}
              </span>
            </div>
            <form
              onSubmit={handleSubmit(onProfileSubmit)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="profile-name"
                  className="text-sm font-medium block mb-1"
                >
                  Name
                </label>
                <Input
                  id="profile-name"
                  {...register("name")}
                  placeholder="Your name"
                />
                {errors.name && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              {errors.root && (
                <p className="text-destructive text-sm">
                  {errors.root.message}
                </p>
              )}
              {updateProfileMutation.isSuccess && (
                <p className="text-green-600 text-sm">Profile updated.</p>
              )}
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting || updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Account tab */}
      {activeTab === "account" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export data</CardTitle>
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
              <CardTitle className="text-destructive">Danger zone</CardTitle>
              <CardDescription>
                Permanently delete your account. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete account
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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
            className="space-y-4 mt-2"
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
