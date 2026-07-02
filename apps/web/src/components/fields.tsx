import {
  cn,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@starter/ui";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  autoComplete?: string;
  icon?: LucideIcon;
}

/** Labelled text input wired to react-hook-form + the shared Form primitives. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  autoComplete,
  icon: Icon,
  type = "text",
}: BaseFieldProps<T> & { type?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            {Icon ? (
              <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            ) : null}
            <FormControl>
              <Input
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className={cn(Icon && "pl-9")}
                {...field}
              />
            </FormControl>
          </div>
          {description ? (
            <FormDescription>{description}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  autoComplete,
  icon: Icon,
}: BaseFieldProps<T>) {
  const [show, setShow] = useState(false);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            {Icon ? (
              <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            ) : null}
            <FormControl>
              <Input
                type={show ? "text" : "password"}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className={cn(Icon && "pl-9", "pr-9")}
                {...field}
              />
            </FormControl>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              tabIndex={-1}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
