import { Button } from "@starter/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";
import { OrgSwitcher } from "./org-switcher";

export function Nav() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="bg-background border-b border-border px-6 py-3 flex items-center gap-6 sticky top-0 z-40">
      <OrgSwitcher />
      <nav className="flex-1 flex gap-6">
        <Link
          to="/dashboard"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <Link
          to="/settings"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Settings
        </Link>
        <Link
          to="/org"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Organization
        </Link>
      </nav>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Sign out
      </Button>
    </header>
  );
}
