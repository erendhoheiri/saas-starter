import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@starter/ui";
import { createRoute, Link } from "@tanstack/react-router";
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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If an account exists for that email address, we&apos;ve sent a
              password reset link.
            </p>
            <p className="mt-4 text-center text-sm">
              <Link
                to="/login"
                className="text-primary underline-offset-4 hover:underline"
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input type="email" placeholder="Email" {...register("email")} />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
            {errors.root && (
              <p className="text-destructive text-sm">{errors.root.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link
              to="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
