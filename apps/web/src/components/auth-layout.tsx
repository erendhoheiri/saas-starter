import type React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-16 px-6 bg-background">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-xs">
          <span className="text-base font-bold text-primary-foreground">S</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Starter
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace
        </p>
      </div>
      {children}
    </div>
  );
}
