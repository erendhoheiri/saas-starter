import { cn } from "@starter/ui";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/** Inline root-level form error banner. Renders nothing when no message. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Inline success banner, mirror of FormError. */
export function FormSuccess({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success",
        className,
      )}
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
