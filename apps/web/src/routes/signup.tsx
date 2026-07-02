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
import { Loader2, Lock, Mail, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "@/components/auth-layout";
import { PasswordField, TextField } from "@/components/fields";
import { FormError } from "@/components/form-error";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/root-route";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupForm = z.infer<typeof signupSchema>;

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
});

function SignupPage() {
  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const {
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: SignupForm) => {
    const result = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });
    if (result.error) {
      setError("root", { message: result.error.message ?? "Sign up failed" });
      return;
    }
    window.location.href = "/dashboard";
  };

  return (
    <AuthLayout subtitle="Create your workspace">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create account</CardTitle>
          <CardDescription>
            Get started — it only takes a minute
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <TextField
                control={form.control}
                name="name"
                label="Full name"
                icon={User}
                placeholder="Jane Smith"
                autoComplete="name"
              />
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                icon={Mail}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <PasswordField
                control={form.control}
                name="password"
                label="Password"
                icon={Lock}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />

              <FormError message={form.formState.errors.root?.message} />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
