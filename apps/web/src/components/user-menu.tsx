import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTheme,
} from "@starter/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { UserAvatar } from "./user-avatar";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * Sidebar footer control: the signed-in user's avatar + name, opening a menu
 * with quick settings, theme switching, and sign-out. Shared by both the app
 * and admin sidebars.
 */
export function UserMenu({
  fallback = "U",
  showSettings = true,
}: {
  fallback?: string;
  showSettings?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate({ to: "/login" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-accent data-[state=open]:bg-accent"
        >
          <UserAvatar
            name={user?.name}
            image={user?.image}
            fallback={fallback}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight text-foreground">
              {user?.name ?? "User"}
            </p>
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {user?.email ?? "Signed in"}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2.5">
          <UserAvatar
            name={user?.name}
            image={user?.image}
            fallback={fallback}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user?.name ?? "User"}
            </p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showSettings && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="gap-2">
                <Settings className="size-4 text-muted-foreground" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="gap-2"
          >
            <Icon className="size-4 text-muted-foreground" />
            <span className="flex-1">{label}</span>
            <Check
              className={cn(
                "size-3.5 text-primary",
                theme === value ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
