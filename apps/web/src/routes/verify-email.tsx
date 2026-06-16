import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@starter/ui";
import { createRoute, Link, useSearch } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/auth-layout";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/router";

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  validateSearch: z.object({ token: z.string().optional() }),
  component: VerifyEmailPage,
});

type VerifyStatus = "idle" | "verifying" | "success" | "error";

function VerifyEmailPage() {
  const { token } = useSearch({ from: "/verify-email" });
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid or missing verification token.");
      return;
    }

    setStatus("verifying");
    authClient
      .verifyEmail({ query: { token } })
      .then((result) => {
        if (result.error) {
          setStatus("error");
          setErrorMessage(result.error.message ?? "Email verification failed.");
        } else {
          setStatus("success");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("An unexpected error occurred.");
      });
  }, [token]);

  return (
    <AuthLayout>
      <Card className="w-full border-primary p-6 max-w-md">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
          <CardDescription>
            {status === "verifying"
              ? "Checking your verification token..."
              : status === "success"
                ? "All done!"
                : "Something went wrong"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "idle" || status === "verifying" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>Verifying your email address...</span>
            </div>
          ) : status === "success" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Your email has been verified successfully.</span>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="text-primary underline-offset-4 hover:underline font-medium"
                >
                  Sign in to continue
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="text-primary underline-offset-4 hover:underline font-medium"
                >
                  Back to sign in
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
