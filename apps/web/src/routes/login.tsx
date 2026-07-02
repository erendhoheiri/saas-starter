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
import { createRoute, Link, useSearch } from "@tanstack/react-router";
import { Loader2, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "@/components/auth-layout";
import { PasswordField, TextField } from "@/components/fields";
import { FormError } from "@/components/form-error";
import { signIn } from "@/lib/auth";
import { rootRoute } from "@/root-route";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginForm = z.infer<typeof loginSchema>;

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = useSearch({ from: "/login" });
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const {
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: LoginForm) => {
    const result = await signIn.email({
      email: data.email,
      password: data.password,
    });
    if (result.error) {
      setError("root", { message: result.error.message ?? "Sign in failed" });
      return;
    }
    // Full navigation ensures the new session is picked up by route guards,
    // and honours the ?redirect= set when an unauthenticated user was bounced.
    window.location.href = redirect ?? "/dashboard";
  };

  return (
    <AuthLayout subtitle="Sign in to your workspace">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign in</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
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
              <div className="space-y-1.5">
                <PasswordField
                  control={form.control}
                  name="password"
                  label="Password"
                  icon={Lock}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <FormError message={form.formState.errors.root?.message} />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
