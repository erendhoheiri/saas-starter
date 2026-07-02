import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTheme,
} from "@starter/ui";
import { Check, Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * Theme switcher. `variant="icon"` renders a compact icon button (sidebars);
 * the default renders a full-width labelled control.
 */
export function ThemeToggle({
  variant = "default",
  align = "end",
  side = "bottom",
}: {
  variant?: "default" | "icon";
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const ResolvedIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label="Change theme"
          >
            <ResolvedIcon className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <ResolvedIcon className="size-4" />
            Theme
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="min-w-36">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
