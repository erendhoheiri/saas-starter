import type React from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-grid relative flex min-h-screen flex-col items-center justify-center bg-muted px-6 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle variant="icon" align="end" />
      </div>

      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <span className="text-base font-bold">S</span>
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {title ?? "Starter"}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="w-full max-w-sm">{children}</div>

      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Starter. All rights reserved.
      </p>
    </div>
  );
}
