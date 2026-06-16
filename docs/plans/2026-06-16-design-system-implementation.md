# Design System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a centralized `packages/ui` design system with light/dark theming and ~30 pre-built components usable across all apps in the monorepo.

**Architecture:** All design tokens live in a single `theme.css` using Tailwind v4's `@theme` block; `.dark` on `<html>` flips semantic tokens for dark mode. A React context (`ThemeProvider`) manages the mode and persists it to `localStorage`. Components are built on Radix UI primitives + CVA + tailwind-merge, following the shadcn pattern already established in the codebase.

**Tech Stack:** Bun, Turborepo, React 19, Tailwind v4, Radix UI, CVA, tailwind-merge, clsx, Sonner (toast), Vaul (drawer)

---

## Task 1: Scaffold `packages/ui`

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`

**Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@starter/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "biome check .",
    "format": "biome check --write .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "1.2.11",
    "@radix-ui/react-alert-dialog": "1.1.14",
    "@radix-ui/react-aspect-ratio": "1.1.7",
    "@radix-ui/react-avatar": "1.1.10",
    "@radix-ui/react-checkbox": "1.3.2",
    "@radix-ui/react-context-menu": "2.2.15",
    "@radix-ui/react-dialog": "1.1.17",
    "@radix-ui/react-dropdown-menu": "2.1.18",
    "@radix-ui/react-label": "2.1.7",
    "@radix-ui/react-popover": "1.1.14",
    "@radix-ui/react-progress": "1.1.7",
    "@radix-ui/react-radio-group": "1.3.7",
    "@radix-ui/react-scroll-area": "1.2.9",
    "@radix-ui/react-select": "2.2.5",
    "@radix-ui/react-separator": "1.1.7",
    "@radix-ui/react-slider": "1.3.5",
    "@radix-ui/react-slot": "1.3.0",
    "@radix-ui/react-switch": "1.2.5",
    "@radix-ui/react-tabs": "1.1.12",
    "@radix-ui/react-tooltip": "1.2.7",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "lucide-react": "1.18.0",
    "sonner": "2.0.6",
    "tailwind-merge": "3.6.0",
    "vaul": "1.1.2"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@starter/config": "workspace:*",
    "@types/react": "^19.1.6",
    "@types/react-dom": "^19.1.5",
    "typescript": "5.9.3"
  }
}
```

**Step 2: Create `packages/ui/tsconfig.json`**

```json
{
  "extends": "@starter/config/tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

**Step 3: Create empty barrel `packages/ui/src/index.ts`**

```ts
// components exported here as they are added
```

**Step 4: Install dependencies**

```bash
bun install
```

Expected: Bun resolves all new packages into `node_modules`.

**Step 5: Typecheck**

```bash
cd packages/ui && bunx tsc --noEmit
```

Expected: No errors (empty file typechecks fine).

**Step 6: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): scaffold packages/ui package"
```

---

## Task 2: Token Layer

**Files:**
- Create: `packages/ui/src/tokens/theme.css`

**Step 1: Create `packages/ui/src/tokens/theme.css`**

```css
@import "tailwindcss";

@theme {
  /* Primitives — raw scales, never used directly in components */
  --color-slate-50: oklch(0.984 0.003 247.858);
  --color-slate-100: oklch(0.968 0.007 247.896);
  --color-slate-200: oklch(0.929 0.013 255.508);
  --color-slate-300: oklch(0.869 0.022 252.894);
  --color-slate-400: oklch(0.704 0.04 256.788);
  --color-slate-500: oklch(0.554 0.046 257.417);
  --color-slate-600: oklch(0.446 0.043 257.281);
  --color-slate-700: oklch(0.372 0.044 257.287);
  --color-slate-800: oklch(0.279 0.041 260.031);
  --color-slate-900: oklch(0.208 0.042 265.755);
  --color-slate-950: oklch(0.129 0.042 264.695);

  /* Semantic tokens — light mode defaults */
  --color-background: var(--color-slate-50);
  --color-foreground: var(--color-slate-950);

  --color-card: var(--color-slate-50);
  --color-card-foreground: var(--color-slate-950);

  --color-primary: oklch(0.585 0.233 277.117); /* indigo-500 */
  --color-primary-foreground: oklch(1 0 0);

  --color-secondary: var(--color-slate-100);
  --color-secondary-foreground: var(--color-slate-900);

  --color-muted: var(--color-slate-100);
  --color-muted-foreground: var(--color-slate-500);

  --color-accent: var(--color-slate-100);
  --color-accent-foreground: var(--color-slate-900);

  --color-destructive: oklch(0.577 0.245 27.325); /* red-500 */
  --color-destructive-foreground: oklch(1 0 0);

  --color-border: var(--color-slate-200);
  --color-input: var(--color-slate-200);
  --color-ring: var(--color-primary);

  /* Shape */
  --radius: 0.5rem;
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
  --radius-xl: calc(var(--radius) + 8px);
}

/* Dark mode — only semantic tokens flip */
.dark {
  --color-background: var(--color-slate-950);
  --color-foreground: var(--color-slate-50);

  --color-card: var(--color-slate-900);
  --color-card-foreground: var(--color-slate-50);

  --color-secondary: var(--color-slate-800);
  --color-secondary-foreground: var(--color-slate-50);

  --color-muted: var(--color-slate-800);
  --color-muted-foreground: var(--color-slate-400);

  --color-accent: var(--color-slate-800);
  --color-accent-foreground: var(--color-slate-50);

  --color-border: var(--color-slate-800);
  --color-input: var(--color-slate-800);
}
```

**Step 2: Commit**

```bash
git add packages/ui/src/tokens/theme.css
git commit -m "feat(ui): add centralized token layer with light/dark palette"
```

---

## Task 3: `cn` Utility

**Files:**
- Create: `packages/ui/src/lib/utils.ts`
- Modify: `packages/ui/src/index.ts`

**Step 1: Create `packages/ui/src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: Export from `packages/ui/src/index.ts`**

```ts
export { cn } from "./lib/utils";
```

**Step 3: Typecheck**

```bash
cd packages/ui && bunx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): add cn utility"
```

---

## Task 4: Theme Provider

**Files:**
- Create: `packages/ui/src/providers/theme-provider.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Create `packages/ui/src/providers/theme-provider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) ?? "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const resolve = () => {
      const resolved =
        theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      localStorage.setItem("theme", theme);
    };

    resolve();
    if (theme === "system") {
      mediaQuery.addEventListener("change", resolve);
      return () => mediaQuery.removeEventListener("change", resolve);
    }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

**Step 2: Add to `packages/ui/src/index.ts`**

```ts
export { cn } from "./lib/utils";
export { ThemeProvider, useTheme } from "./providers/theme-provider";
```

**Step 3: Typecheck**

```bash
cd packages/ui && bunx tsc --noEmit
```

**Step 4: Commit**

```bash
git add packages/ui/src/providers/ packages/ui/src/index.ts
git commit -m "feat(ui): add ThemeProvider and useTheme hook"
```

---

## Task 5: Wire `apps/web` to `packages/ui`

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/App.tsx`

**Step 1: Add `@starter/ui` to `apps/web/package.json` dependencies**

In `apps/web/package.json`, add to `"dependencies"`:

```json
"@starter/ui": "workspace:*"
```

**Step 2: Run install**

```bash
bun install
```

**Step 3: Replace `apps/web/src/styles.css`**

```css
@import "@starter/ui/src/tokens/theme.css";
```

**Step 4: Update `apps/web/src/App.tsx`**

```tsx
import { ThemeProvider } from "@starter/ui";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
```

**Step 5: Verify dev server starts**

```bash
bun dev
```

Expected: Dev server starts, no import errors, page renders.

**Step 6: Commit**

```bash
git add apps/web/package.json apps/web/src/styles.css apps/web/src/App.tsx bun.lock
git commit -m "feat(web): wire ThemeProvider and token layer from @starter/ui"
```

---

## Task 6: Migrate Existing Components

Move `apps/web/src/components/ui/{button,input,card,dialog,dropdown-menu}.tsx` into `packages/ui/src/components/`. Update their internal `@/lib/utils` imports to `../lib/utils`.

**Files:**
- Create: `packages/ui/src/components/button.tsx` (from apps/web)
- Create: `packages/ui/src/components/input.tsx` (from apps/web)
- Create: `packages/ui/src/components/card.tsx` (from apps/web)
- Create: `packages/ui/src/components/dialog.tsx` (from apps/web)
- Create: `packages/ui/src/components/dropdown-menu.tsx` (from apps/web)
- Delete: `apps/web/src/components/ui/` (entire directory)
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/web/src/components/` (any files importing from `@/components/ui/*`)

**Step 1: Copy each file, fix imports**

For each file, copy content and replace:
```ts
// FROM
import { cn } from "@/lib/utils";
// TO
import { cn } from "../lib/utils";
```

**Step 2: Update `packages/ui/src/index.ts`**

```ts
export { cn } from "./lib/utils";
export { ThemeProvider, useTheme } from "./providers/theme-provider";
export { Button, buttonVariants } from "./components/button";
export { Input } from "./components/input";
export {
  Card, CardHeader, CardTitle, CardDescription,
  CardAction, CardContent, CardFooter,
} from "./components/card";
export {
  Dialog, DialogTrigger, DialogPortal, DialogOverlay,
  DialogClose, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from "./components/dialog";
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut,
  DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup,
} from "./components/dropdown-menu";
```

**Step 3: Delete `apps/web/src/components/ui/`**

```bash
rm -rf apps/web/src/components/ui
```

**Step 4: Update imports in apps/web**

Find all files in `apps/web/src` that import from `@/components/ui/` and change them to `@starter/ui`. Example:

```ts
// FROM
import { Button } from "@/components/ui/button";
// TO
import { Button } from "@starter/ui";
```

Run this to find all affected files:
```bash
grep -r "@/components/ui" apps/web/src --include="*.tsx" --include="*.ts" -l
```

**Step 5: Typecheck both packages**

```bash
cd packages/ui && bunx tsc --noEmit
cd apps/web && bunx tsc --noEmit
```

Expected: No errors.

**Step 6: Verify dev server**

```bash
bun dev
```

Expected: App renders correctly, no missing module errors.

**Step 7: Commit**

```bash
git add packages/ui/src/components/ packages/ui/src/index.ts apps/web/src/
git commit -m "feat(ui): migrate existing components to packages/ui"
```

---

## Task 7: Stateless Components (No New Deps)

Add: Textarea, Badge, Skeleton, Alert, Separator, Breadcrumb, Table, Label.

**Files:**
- Create: `packages/ui/src/components/textarea.tsx`
- Create: `packages/ui/src/components/badge.tsx`
- Create: `packages/ui/src/components/skeleton.tsx`
- Create: `packages/ui/src/components/alert.tsx`
- Create: `packages/ui/src/components/separator.tsx`
- Create: `packages/ui/src/components/breadcrumb.tsx`
- Create: `packages/ui/src/components/table.tsx`
- Create: `packages/ui/src/components/label.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: `textarea.tsx`**

```tsx
import type * as React from "react";
import { cn } from "../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
```

**Step 2: `badge.tsx`**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

**Step 3: `skeleton.tsx`**

```tsx
import type * as React from "react";
import { cn } from "../lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
```

**Step 4: `alert.tsx`**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground",
        destructive:
          "border-destructive/50 text-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground col-start-2 text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
```

**Step 5: `separator.tsx`**

```tsx
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type * as React from "react";
import { cn } from "../lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
```

**Step 6: `breadcrumb.tsx`**

```tsx
import { ChevronRight, MoreHorizontal } from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/utils";

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav data-slot="breadcrumb" aria-label="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn("text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5", className)}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />
  );
}

function BreadcrumbLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="breadcrumb-link"
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li role="presentation" aria-hidden="true" className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)} {...props}>
      {children ?? <ChevronRight />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn("flex h-9 w-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis,
};
```

**Step 7: `table.tsx`**

```tsx
import type * as React from "react";
import { cn } from "../lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-auto">
      <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("text-muted-foreground h-10 px-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
```

**Step 8: `label.tsx`**

```tsx
import * as LabelPrimitive from "@radix-ui/react-label";
import type * as React from "react";
import { cn } from "../lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
```

**Step 9: Update `packages/ui/src/index.ts`** — append exports for all 8 new components:

```ts
export { Textarea } from "./components/textarea";
export { Badge, badgeVariants } from "./components/badge";
export { Skeleton } from "./components/skeleton";
export { Alert, AlertTitle, AlertDescription } from "./components/alert";
export { Separator } from "./components/separator";
export {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis,
} from "./components/breadcrumb";
export {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption,
} from "./components/table";
export { Label } from "./components/label";
```

**Step 10: Typecheck**

```bash
cd packages/ui && bunx tsc --noEmit
```

**Step 11: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): add Textarea, Badge, Skeleton, Alert, Separator, Breadcrumb, Table, Label"
```

---

## Task 8: Avatar, Checkbox, Radio, Switch

**Files:**
- Create: `packages/ui/src/components/avatar.tsx`
- Create: `packages/ui/src/components/checkbox.tsx`
- Create: `packages/ui/src/components/radio-group.tsx`
- Create: `packages/ui/src/components/switch.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: `avatar.tsx`**

```tsx
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type * as React from "react";
import { cn } from "../lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("bg-muted flex h-full w-full items-center justify-center rounded-full text-xs font-medium", className)}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
```

**Step 2: `checkbox.tsx`**

```tsx
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current transition-none">
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
```

**Step 3: `radio-group.tsx`**

```tsx
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/utils";

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />
  );
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive aspect-square size-4 rounded-full border shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="relative flex items-center justify-center">
        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
```

**Step 4: `switch.tsx`**

```tsx
import * as SwitchPrimitive from "@radix-ui/react-switch";
import type * as React from "react";
import { cn } from "../lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "bg-background pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
```

**Step 5: Update `packages/ui/src/index.ts`** — append:

```ts
export { Avatar, AvatarImage, AvatarFallback } from "./components/avatar";
export { Checkbox } from "./components/checkbox";
export { RadioGroup, RadioGroupItem } from "./components/radio-group";
export { Switch } from "./components/switch";
```

**Step 6: Typecheck + commit**

```bash
cd packages/ui && bunx tsc --noEmit
git add packages/ui/src/
git commit -m "feat(ui): add Avatar, Checkbox, RadioGroup, Switch"
```

---

## Task 9: Select, Slider, Progress, Scroll Area, Aspect Ratio

**Files:**
- Create: `packages/ui/src/components/select.tsx`
- Create: `packages/ui/src/components/slider.tsx`
- Create: `packages/ui/src/components/progress.tsx`
- Create: `packages/ui/src/components/scroll-area.tsx`
- Create: `packages/ui/src/components/aspect-ratio.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: `select.tsx`**

```tsx
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectScrollDownButton, SelectScrollUpButton, SelectSeparator,
  SelectTrigger, SelectValue,
};
```

**Step 2: `slider.tsx`**

```tsx
import * as SliderPrimitive from "@radix-ui/react-slider";
import type * as React from "react";
import { cn } from "../lib/utils";

function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", className)}
      {...props}
    >
      <SliderPrimitive.Track className="bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5">
        <SliderPrimitive.Range className="bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="border-primary/50 bg-background focus-visible:ring-ring/50 block size-4 shrink-0 rounded-full border shadow transition-[color,box-shadow] hover:border-primary focus-visible:outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
```

**Step 3: `progress.tsx`**

```tsx
import * as ProgressPrimitive from "@radix-ui/react-progress";
import type * as React from "react";
import { cn } from "../lib/utils";

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
```

**Step 4: `scroll-area.tsx`**

```tsx
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import type * as React from "react";
import { cn } from "../lib/utils";

function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative", className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="ring-ring/10 dark:ring-ring/20 focus-visible:ring-1 h-full w-full rounded-[inherit] transition-[color,box-shadow] outline-none">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="bg-border relative flex-1 rounded-full" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
```

**Step 5: `aspect-ratio.tsx`**

```tsx
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

const AspectRatio = AspectRatioPrimitive.Root;
export { AspectRatio };
```

**Step 6: Update `packages/ui/src/index.ts`** — append:

```ts
export {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectScrollDownButton, SelectScrollUpButton, SelectSeparator,
  SelectTrigger, SelectValue,
} from "./components/select";
export { Slider } from "./components/slider";
export { Progress } from "./components/progress";
export { ScrollArea, ScrollBar } from "./components/scroll-area";
export { AspectRatio } from "./components/aspect-ratio";
```

**Step 7: Typecheck + commit**

```bash
cd packages/ui && bunx tsc --noEmit
git add packages/ui/src/
git commit -m "feat(ui): add Select, Slider, Progress, ScrollArea, AspectRatio"
```

---

## Task 10: Tabs, Popover, Tooltip, Alert Dialog, Context Menu

**Files:**
- Create: `packages/ui/src/components/tabs.tsx`
- Create: `packages/ui/src/components/popover.tsx`
- Create: `packages/ui/src/components/tooltip.tsx`
- Create: `packages/ui/src/components/alert-dialog.tsx`
- Create: `packages/ui/src/components/context-menu.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: `tabs.tsx`**

```tsx
import * as TabsPrimitive from "@radix-ui/react-tabs";
import type * as React from "react";
import { cn } from "../lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg p-1", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

**Step 2: `popover.tsx`**

```tsx
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type * as React from "react";
import { cn } from "../lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({ className, align = "center", sideOffset = 4, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-lg border p-4 shadow-md outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
```

**Step 3: `tooltip.tsx`**

```tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type * as React from "react";
import { cn } from "../lib/utils";

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({ className, sideOffset = 0, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

**Step 4: `alert-dialog.tsx`**

```tsx
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type * as React from "react";
import { buttonVariants } from "./button";
import { cn } from "../lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className)}
      {...props}
    />
  );
}

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("text-lg font-semibold", className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />;
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />;
}

export {
  AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger,
  AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
};
```

**Step 5: `context-menu.tsx`**

Use the same structure as `dropdown-menu.tsx` but swap all `DropdownMenuPrimitive` references with `ContextMenuPrimitive` from `@radix-ui/react-context-menu`. The Trigger becomes `<ContextMenuPrimitive.Trigger asChild>` and it renders on right-click. Export names prefixed with `ContextMenu`.

**Step 6: Update `packages/ui/src/index.ts`** — append:

```ts
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/tabs";
export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent } from "./components/popover";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./components/tooltip";
export {
  AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger,
  AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "./components/alert-dialog";
export {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
  ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel,
  ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup,
  ContextMenuPortal, ContextMenuSub, ContextMenuSubContent,
  ContextMenuSubTrigger, ContextMenuRadioGroup,
} from "./components/context-menu";
```

**Step 7: Typecheck + commit**

```bash
cd packages/ui && bunx tsc --noEmit
git add packages/ui/src/
git commit -m "feat(ui): add Tabs, Popover, Tooltip, AlertDialog, ContextMenu"
```

---

## Task 11: Toast (Sonner) + Drawer (Vaul)

**Files:**
- Create: `packages/ui/src/components/sonner.tsx`
- Create: `packages/ui/src/components/drawer.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: `sonner.tsx`**

```tsx
import { useTheme } from "../providers/theme-provider";
import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
```

**Step 2: `drawer.tsx`**

```tsx
import type * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "../lib/utils";

const Drawer = ({ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      {...props}
    />
  );
}

function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        className={cn(
          "bg-background fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border",
          className,
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 h-2 w-[100px] rounded-full" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />;
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />;
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose,
  DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription,
};
```

**Step 3: Add `<Toaster />` to `apps/web/src/App.tsx`**

```tsx
import { ThemeProvider } from "@starter/ui";
import { Toaster } from "@starter/ui";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
```

**Step 4: Update `packages/ui/src/index.ts`** — append:

```ts
export { Toaster } from "./components/sonner";
export {
  Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose,
  DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription,
} from "./components/drawer";
```

**Step 5: Typecheck + commit**

```bash
cd packages/ui && bunx tsc --noEmit
git add packages/ui/src/ apps/web/src/App.tsx
git commit -m "feat(ui): add Toaster (Sonner) and Drawer (Vaul)"
```

---

## Task 12: Form Wrapper

**Files:**
- Create: `packages/ui/src/components/form.tsx`
- Modify: `packages/ui/package.json` (add `react-hook-form` peer dependency)
- Modify: `packages/ui/src/index.ts`

**Step 1: Add peer dependency to `packages/ui/package.json`**

In `"peerDependencies"`:
```json
"react-hook-form": ">=7.0.0"
```

**Step 2: Create `packages/ui/src/components/form.tsx`**

```tsx
import type * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  type UseFormReturn,
} from "react-hook-form";
import { cn } from "../lib/utils";
import { Label } from "./label";

const Form = FormProvider;

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) throw new Error("useFormField must be used within <FormField>");

  const { id } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

interface FormItemContextValue { id: string }
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("grid gap-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField();
  return <Label className={cn(error && "text-destructive", className)} htmlFor={formItemId} {...props} />;
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;
  if (!body) return null;
  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
```

**Step 3: Update `packages/ui/src/index.ts`** — append:

```ts
export {
  Form, FormControl, FormDescription, FormField,
  FormItem, FormLabel, FormMessage, useFormField,
} from "./components/form";
```

**Step 4: Typecheck**

```bash
cd packages/ui && bunx tsc --noEmit
```

**Step 5: Commit**

```bash
git add packages/ui/src/ packages/ui/package.json
git commit -m "feat(ui): add Form wrapper for react-hook-form"
```

---

## Task 13: Final Typecheck + Smoke Test

**Step 1: Full monorepo typecheck**

```bash
bun typecheck
```

Expected: No errors across all packages.

**Step 2: Start dev server and verify**

```bash
bun dev
```

Open the app in a browser. Confirm:
- Page renders without errors
- No missing module errors in console

**Step 3: Verify theme toggle works**

In any route component, temporarily add:

```tsx
import { useTheme } from "@starter/ui";

const { setTheme, resolvedTheme } = useTheme();
// Add a button: <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>Toggle</button>
```

Confirm the page switches between light and dark modes. Remove the temporary code.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(ui): complete design system — 30 components, centralized theming"
```
