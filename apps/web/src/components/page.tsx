import { cn } from "@starter/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const MAX_WIDTH = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
} as const;

/** Consistent page container: centered, padded, width-capped. */
export function Page({
  children,
  size = "lg",
  className,
}: {
  children: ReactNode;
  size?: keyof typeof MAX_WIDTH;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 py-8 md:px-8",
        MAX_WIDTH[size],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page header with an optional icon chip, description, and trailing actions. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
            <Icon className="size-5" />
          </div>
        ) : null}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
