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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@starter/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { Download, Loader2, Settings, Trash2, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/fields";
import { Page, PageHeader } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { queryClient } from "@/lib/query";
import { appLayoutRoute } from "@/routes/_app";

export const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: SettingsPage,
});

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
});
type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

const DELETE_PHRASE = "delete my account";

interface Profile {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["account", "me"],
    queryFn: async (): Promise<Profile> => {
      const res = await api.api.account.me.$get();
      return (await res.json()) as Profile;
    },
    enabled: !!user,
  });

  const form = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    values: { name: profile?.name ?? user?.name ?? "" },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: UpdateProfileForm) => {
      const res = await api.api.account.me.$patch({ json: data });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "me"] });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const exportData = useMutation({
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
    onSuccess: () => toast.success("Your data export has downloaded"),
    onError: () => toast.error("Export failed. Please try again."),
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const res = await api.api.account.me.$delete();
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: async () => {
      await signOut();
      navigate({ to: "/login" });
    },
    onError: () => toast.error("Failed to delete account. Please try again."),
  });

  return (
    <Page size="md">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Manage your profile and account"
      />

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            <Settings className="size-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardContent className="flex items-center gap-4">
              <UserAvatar
                name={user?.name}
                image={user?.image}
                className="size-12 text-base"
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {user?.name ?? "User"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {profile?.email ?? user?.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit profile</CardTitle>
              <CardDescription>Update your display name.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((d) => updateProfile.mutate(d))}
                  className="space-y-4"
                >
                  <TextField
                    control={form.control}
                    name="name"
                    label="Full name"
                    icon={User}
                    placeholder="Your name"
                  />
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    {updateProfile.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="size-4 text-muted-foreground" />
                <CardTitle>Export data</CardTitle>
              </div>
              <CardDescription>
                Download a JSON bundle of your account data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => exportData.mutate()}
                disabled={exportData.isPending}
              >
                {exportData.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {exportData.isPending ? "Exporting…" : "Export my data"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="size-4 text-destructive" />
                <CardTitle className="text-destructive">Danger zone</CardTitle>
              </div>
              <CardDescription>
                Permanently delete your account and all associated data. This
                cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Delete account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all associated data. To
              confirm, type <strong>{DELETE_PHRASE}</strong> below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="sr-only">
              Confirmation phrase
            </Label>
            <Input
              id="confirm-delete"
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
              disabled={
                confirmText !== DELETE_PHRASE || deleteAccount.isPending
              }
              onClick={() => deleteAccount.mutate()}
            >
              {deleteAccount.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {deleteAccount.isPending ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
