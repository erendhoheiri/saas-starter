# Design System

**Date:** 2026-06-16  
**Status:** Approved

## Goals

- Centralized light/dark theming via CSS variables — change 10 lines to retheme an entire project
- ~30 pre-built components covering all common UI needs
- Built on Radix UI primitives + CVA + tailwind-merge (shadcn pattern)
- Lives in `packages/ui` — shareable across all apps in the monorepo

---

## Architecture

Three layers in a new `packages/ui` workspace package:

```
packages/ui/
├── src/
│   ├── tokens/
│   │   └── theme.css           # single source of truth for all tokens
│   ├── providers/
│   │   └── theme-provider.tsx  # light/dark state + localStorage persist
│   ├── components/
│   │   └── *.tsx               # ~30 components
│   └── index.ts                # barrel export
└── package.json
```

---

## Token System

All tokens defined in `packages/ui/src/tokens/theme.css` using Tailwind v4's `@theme` block.

**Rules:**
- Primitive palette (raw color scales) — never referenced by components directly
- Semantic tokens (`--color-background`, `--color-foreground`, etc.) — what components use
- Dark mode flips only semantic tokens via `.dark` on `<html>`
- `--radius` controls global border radius

```css
@import "tailwindcss";

@theme {
  --color-background: #f8fafc;
  --color-foreground: #020617;
  --color-primary: #6366f1;
  --color-primary-foreground: #ffffff;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-border: #e2e8f0;
  --color-destructive: #ef4444;
  --color-ring: var(--color-primary);

  --radius: 0.5rem;
  --radius-sm: calc(var(--radius) - 2px);
  --radius-lg: calc(var(--radius) + 4px);
}

.dark {
  --color-background: #020617;
  --color-foreground: #f8fafc;
  --color-muted: #1e293b;
  --color-muted-foreground: #94a3b8;
  --color-border: #1e293b;
}
```

---

## Theme Provider

React context in `packages/ui/src/providers/theme-provider.tsx`:

- Supports `"light" | "dark" | "system"` — `"system"` follows OS preference
- Persists choice to `localStorage`
- Toggles `.dark` class on `document.documentElement`
- Exposes `useTheme()` hook for reading/changing theme from any component
- Wrapped once in `apps/web/src/App.tsx`

---

## Component Inventory

All components: Radix primitive + CVA variants + tailwind-merge.

| Category | Components |
|---|---|
| **Inputs** | Button, Input, Textarea, Select, Checkbox, Radio, Switch, Slider |
| **Layout** | Card, Separator, Scroll Area, Aspect Ratio |
| **Overlay** | Dialog, Drawer, Popover, Tooltip, Alert Dialog |
| **Navigation** | Dropdown Menu, Context Menu, Tabs, Breadcrumb |
| **Feedback** | Toast (Sonner), Badge, Alert, Progress, Skeleton |
| **Data** | Table, Avatar, Label |
| **Form** | Form (react-hook-form wrapper) |

Migrate existing components from `apps/web/src/components/ui/` into `packages/ui` and extend.

---

## Integration

1. `apps/web` adds `@starter/ui` as a dependency
2. `theme.css` imported once in `apps/web/src/styles.css`
3. `<ThemeProvider>` wraps the app in `App.tsx`
4. All component imports come from `@starter/ui`
