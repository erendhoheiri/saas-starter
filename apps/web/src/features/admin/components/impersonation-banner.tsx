import { Button } from "@starter/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { api } from "@/lib/api";

export function ImpersonationBanner() {
  const { user, isImpersonating } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  async function handleExit() {
    await api.api.admin.impersonate.exit.$post();
    await queryClient.invalidateQueries();
    navigate({ to: "/admin/users" });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/15 px-4 py-2 text-sm">
      <span className="text-warning-foreground/90 dark:text-warning">
        Viewing as <strong className="font-semibold">{user?.email}</strong>
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 border-warning/40"
        onClick={handleExit}
      >
        <LogOut className="size-3.5" />
        Exit
      </Button>
    </div>
  );
}
