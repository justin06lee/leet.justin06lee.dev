# Code conventions & patterns

How code is written across the projects, beyond the visual rules. Follow these so new code is
indistinguishable from existing code.

## Formatting

- **2-space indent**, **double quotes**, **semicolons always**, **trailing commas** in multiline literals.
- No Prettier config — ESLint (`next/core-web-vitals` + `next/typescript`) is the source of truth. When
  authoring library/vendored components, the chrome/hooks dirs relax two rules: `react-hooks/refs` off
  (hooks read refs during render for scroll sync) and unused vars prefixed `_` are allowed.
- Wrap JSX props one-per-line once an element has more than ~2–3 attributes.

## TypeScript

- `strict: true`. **Never `any`.** Type every prop and public return.
- Props are an exported `type` (occasionally `interface` when extending native attrs, e.g. `InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>`).
- Use generics for reusable controls: `Select<T extends string | number>`, `Tabs<T extends string>`.
- Discriminated unions for state machines: `{ kind: "confirm"; ... } | { kind: "alert"; ... } | null`.
- `as const` for read-only config maps (`const SIZE = { sm: {...}, md: {...} } as const`).
- JSDoc each non-obvious prop with a one-line `/** ... */` — these double as the registry docs.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component | PascalCase | `CardHeader`, `Navbar` |
| Component file | PascalCase.tsx (in `.dev` apps) or kebab in the library registry | `Navbar.tsx`, `card.tsx` |
| Util/lib file | kebab-case.ts | `site-config.ts`, `use-line-sync.ts` |
| Hook | `useThing`, file `use-thing.ts` | `useTabs` / `use-tabs.ts` |
| Type / interface | PascalCase | `ButtonProps`, `SelectOption` |
| Constant map | UPPER_SNAKE_CASE | `CATEGORY_PALETTE`, `SIZE` |
| Variable / fn | camelCase | `handleClick`, `pickNextColor` |
| Event handler | `handle*` prefix | `handleMouseEnter` |
| Boolean | `is*` / `has*` | `isOpen`, `hasIcon` |
| CSS var / class | kebab with `--` / kebab | `--surface-alt`, `chrome-dialog-panel` |

## Exports

- **UI primitives / hooks → named exports.** Pages & route files → default export. (Historical exception:
  `Select` is a default export — leave it as-is.)
- **No barrel `index.ts`** — import components directly by path (`@/components/chrome/button`).
- Compound components export the shell plus each slot as separate named functions.

## Imports — ordering

1. React / Next built-ins
2. Third-party packages (lucide-react, motion, …)
3. Local absolute (`@/...`)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/lib/site-config";
```

## Component authoring checklist

When creating a new component, mirror the library:

1. Function component. `"use client"` only if it has state/effects/handlers.
2. Exported `Props` type; JSDoc the interesting props; destructure with defaults in the signature.
3. If it has non-trivial stateful behaviour (keyboard nav, open/close, focus), **put that in a headless
   `use-*` hook** returning prop-getters + state, and keep the component as the skin. See `useTabs` in
   `primitives.md`.
4. Variants as a `Record<Variant, string>`; compose classes with `cn(base, variantClass[v], className)` —
   `className` last.
5. Square corners, translucent-white borders, opacity for hierarchy. Hover = `bg-white/5`/`bg-white/10`
   or border brighten. Focus = `focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50`.
6. `background?: string` escape-hatch prop if a caller may want a dynamic bg.
7. Wire ARIA + keyboard support (see below). Decorative icons get `aria-hidden`.

## Accessibility recipes (these are expected, not optional)

- **Roving tabindex** for tab/listbox: only the active item has `tabIndex={0}`, the rest `-1`; arrows move
  focus and selection, skipping disabled items; Home/End jump to ends.
- **Listbox / combobox:** `role="listbox"` + `role="option"` + `aria-selected`; trigger gets
  `aria-haspopup`, `aria-expanded`, and `aria-activedescendant` pointing at the highlighted option id.
- **Dialog:** `role="dialog"`, `aria-modal`, `aria-labelledby`; trap Tab within the panel; restore focus
  to the previously focused element on close; Escape closes.
- **Outside-click / Escape close** is wired only while open, and cleaned up on close.
- **Escape inside nested overlays:** listen on the capture phase and `stopImmediatePropagation()` so an
  inner Select's Escape doesn't also dismiss the surrounding modal.
- **Body scroll lock** while a full-screen panel/sheet is open (save & restore `document.body.style.overflow`).
- **Copy/async feedback:** announce via an `aria-live="polite" role="status"` `sr-only` span; revert the
  visible "Copied!" after ~1.5s.
- **Icon-only buttons** must have an `aria-label` (fall back to the tooltip text).

## Animation (Motion)

Use `motion` for enter/exit and gestural motion; plain `transition-colors` for simple hovers.

```tsx
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";

<AnimatePresence>
  {open && (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/50"
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-y-0 right-0 z-[80] w-72 sm:w-80 border-l border-white/10 bg-black"
      >
        {/* panel */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

Idioms: durations 0.2–0.6s, `ease: "easeInOut"` for slides, `cubic-bezier(0.2, 0.8, 0.2, 1)` for subtle
pops. Use the **Web Animations API** (`el.animate([...], {...})`) for one-shot effects like the Tilt
shine, and **CSS keyframes** injected via a `<style precedence="default" href="...">` tag for things like
the dialog entrance (so the keyframes dedupe). Keep motion restrained — it should feel quiet and precise,
not bouncy.

## Data / state

- **No Redux/Zustand.** Local `useState` + `useContext` for small shared scopes (Dialog, Navbar).
- **Server components fetch data**; client components handle interaction. Filters/sort live in the **URL**
  via `useRouter` + `useSearchParams` + `URLSearchParams`, not local state, so they're shareable.
- API routes: named exports per method, `export const dynamic = "force-dynamic"` on data routes,
  try/catch around `req.json()` returning a 400 on parse failure, validate before mutating.
- **Race-safe async commits:** bump a `generation` ref before an await and ignore the result if it's stale
  (see `useInlineEdit`) — prevents an old in-flight save from clobbering newer state.
