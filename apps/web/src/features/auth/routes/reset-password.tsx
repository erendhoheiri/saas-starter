import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
} from "@starter/ui";
import {
  createRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { PasswordField } from "@/features/auth/components/fields";
import { FormError } from "@/features/auth/components/form-error";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/root-route";

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  validateSearch: z.object({ token: z.string().optional() }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/reset-password" });
  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const {
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError("root", { message: "Invalid or missing reset token" });
      return;
    }
    const result = await authClient.resetPassword({
      newPassword: data.newPassword,
      token,
    });
    if (result.error) {
      setError("root", {
        message: result.error.message ?? "Failed to reset password",
      });
      return;
    }
    navigate({ to: "/login" });
  };

  if (!token) {
    return (
      <AuthLayout subtitle="Reset your password">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Invalid link</p>
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="Reset your password">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reset password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <PasswordField
                control={form.control}
                name="newPassword"
                label="New password"
                icon={Lock}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <PasswordField
                control={form.control}
                name="confirmPassword"
                label="Confirm password"
                icon={Lock}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
              <FormError message={form.formState.errors.root?.message} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? "Resetting…" : "Reset password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
