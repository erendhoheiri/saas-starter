import { createRoute, Link, useSearch } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth"
import { rootRoute } from "@/router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  validateSearch: z.object({ token: z.string().optional() }),
  component: VerifyEmailPage,
})

import { z } from "zod"

type VerifyStatus = "idle" | "verifying" | "success" | "error"

function VerifyEmailPage() {
  const { token } = useSearch({ from: "/verify-email" })
  const [status, setStatus] = useState<VerifyStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMessage("Invalid or missing verification token.")
      return
    }

    setStatus("verifying")
    authClient
      .verifyEmail({ query: { token } })
      .then((result) => {
        if (result.error) {
          setStatus("error")
          setErrorMessage(result.error.message ?? "Email verification failed.")
        } else {
          setStatus("success")
        }
      })
      .catch(() => {
        setStatus("error")
        setErrorMessage("An unexpected error occurred.")
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "idle" || status === "verifying" ? (
            <p className="text-sm text-muted-foreground">Verifying your email address...</p>
          ) : status === "success" ? (
            <div className="space-y-3">
              <p className="text-sm text-green-600">Your email has been verified successfully.</p>
              <p className="text-center text-sm">
                <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                  Sign in to continue
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-500">{errorMessage}</p>
              <p className="text-center text-sm">
                <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
