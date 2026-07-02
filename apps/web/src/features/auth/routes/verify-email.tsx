import { Button, Card, CardContent } from "@starter/ui";
import { createRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { authClient } from "@/lib/auth";
import { rootRoute } from "@/root-route";

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  validateSearch: z.object({ token: z.string().optional() }),
  component: VerifyEmailPage,
});

type VerifyStatus = "verifying" | "success" | "error";

function VerifyEmailPage() {
  const { token } = useSearch({ from: "/verify-email" });
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid or missing verification token.");
      return;
    }

    // Reset while (re)verifying so a changed token doesn't show stale state.
    setStatus("verifying");
    setErrorMessage(null);

    (async () => {
      try {
        const result = await authClient.verifyEmail({ query: { token } });
        if (cancelled) return;
        if (result.error) {
          setStatus("error");
          setErrorMessage(result.error.message ?? "Email verification failed.");
        } else {
          setStatus("success");
        }
      } catch {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage("An unexpected error occurred.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthLayout subtitle="Verify your email">
      <Card>
        <CardContent className="py-8" aria-live="polite">
          {status === "verifying" ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Verifying your email address…
              </p>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">Email verified</p>
                <p className="text-sm text-muted-foreground">
                  Your email address has been confirmed.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/login">Sign in to continue</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Verification failed
                </p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
