import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@starter/ui";
import { createRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "@/components/auth-layout";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/router";

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    const result = await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: "/reset-password",
    });
    if (result.error) {
      setError("root", {
        message: result.error.message ?? "Failed to send reset email",
      });
    }
  };

  if (isSubmitSuccessful) {
    return (
      <AuthLayout>
        <Card className="w-full border-primary p-6 max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If an account exists for that email address, we&apos;ve sent a
              password reset link.
            </p>
            <p className="text-center text-sm">
              <Link
                to="/login"
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="w-full border-primary p-6 max-w-md">
        <CardHeader>
          <CardTitle className="text-lg text-primary font-semibold">
            Forgot password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm">
                  {errors.email.message}
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link
              to="/login"
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
