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
import { createRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { TextField } from "@/features/auth/components/fields";
import { FormError } from "@/features/auth/components/form-error";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/root-route";

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
  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const {
    handleSubmit,
    setError,
    formState: { isSubmitting, isSubmitSuccessful },
  } = form;

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
      <AuthLayout subtitle="Reset your password">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-success/10 text-success">
              <MailCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Check your email</p>
              <p className="text-sm text-muted-foreground">
                If an account exists for that address, we&apos;ve sent a
                password reset link.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Back to sign in</Link>
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
          <CardTitle className="text-base">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                icon={Mail}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <FormError message={form.formState.errors.root?.message} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm">
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
