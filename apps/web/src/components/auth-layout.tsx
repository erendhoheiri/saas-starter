import type React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold tracking-tight">Starter</span>
      </div>
      {children}
    </div>
  );
}
