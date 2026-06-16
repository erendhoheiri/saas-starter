import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@starter/ui";
import {
  createRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/router";

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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

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
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
            <p className="mt-4 text-center text-sm">
              <Link
                to="/forgot-password"
                className="text-primary underline-offset-4 hover:underline"
              >
                Request a new link
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-red-500 text-sm">
                {errors.newPassword.message}
              </p>
            )}
            <Input
              type="password"
              placeholder="Confirm new password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm">
                {errors.confirmPassword.message}
              </p>
            )}
            {errors.root && (
              <p className="text-red-500 text-sm">{errors.root.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
