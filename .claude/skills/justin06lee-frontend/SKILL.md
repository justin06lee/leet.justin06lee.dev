---
name: justin06lee-frontend
description: >
  The justin06lee.dev house frontend design system and the @justin06lee/chrome UI component library.
  Use when the user explicitly invokes this style — asking for the justin06lee.dev / chrome.justin06lee.dev
  look, naming the chrome UI library or its components, or asking to build, restyle, or continue the
  current project in that style. Triggers on phrases like "justin06lee.dev style", "the chrome UI
  library", "use my chrome components", "my design system", "the house style", "make this look like my
  site", "match my other projects", or "style this like justin06lee.dev". Once triggered, it governs the
  whole task: dark-only black/white, square corners, Tailwind v4, Poppins, Motion, the cn() helper, and
  the Chrome components. Do NOT use for generic frontend, React, or Tailwind work that never references
  this design system — an unrelated project has its own conventions and this skill would override them.
argument-hint: "[optional: component name or task, e.g. 'card', 'new page', 'modal']"
---

# justin06lee frontend

This skill is the single source of truth for how frontend code looks and is built across justin06lee's
projects. The goal: **reproduce the house style exactly, from memory, without ever opening the source
repos.** Everything you need is embedded in this skill and its reference files.

**Scope.** This style is opt-in. It applies once the user has asked for it — by name, by naming the
Chrome library, or by asking that the current project look like justin06lee.dev. Having been invoked, it
then governs the entire task: every component, colour, and border in what you touch. If you find yourself
here on a project that never asked for this look, stop and use that project's own conventions instead.

The aesthetic in one breath: **dark-only, pure black on white, square corners, thin translucent borders,
Poppins type, restrained Motion, opacity for hierarchy.** It is minimal and severe on purpose. When in
doubt, do less.

## The law (read this every time)

These are the rules that, if broken, make code stop looking like "ours." They are short on purpose.

1. **Use the Chrome component library — don't hand-roll primitives.** A button is `<Button>`, a modal is
   `useDialog()`, a dropdown is `<Select>`/`<Combobox>`, tabs are `<Tabs>`, a chip is `<Badge>`, a
   bordered container is `<Card>`. Reach for raw `<button>`/`<input>` or a from-scratch dropdown only
   when no Chrome component fits — and say so. The full inventory is in `references/components.md`.
2. **Dark only. Black and white only.** Background is `#000`, text is `#fff`. There is no light mode and
   no colour palette — build hierarchy with **white at different opacities** (`text-white`,
   `text-white/80`, `text-white/60`, `border-white/20`, `bg-white/5`). The only chromatic colour is red,
   reserved for danger/destructive states (`text-red-300`, `border-red-400/60`, `bg-red-400/10`).
3. **Square corners. No `rounded-*`.** Ever. Borders are thin (1px) and translucent white.
4. **Tailwind v4 utility classes only.** No CSS Modules, no styled-components, no inline `style` except
   for a dynamic `background`/transform that can't be a utility. Merge classes with `cn()` (never string
   concatenation), always placing an incoming `className` prop last so callers can override.
5. **Variants are a `Record<Variant, string>`, not `cva`.** See the pattern below. We don't depend on
   class-variance-authority.
6. **Stateful behaviour goes in a headless hook; the component only skins it.** Tabs/select/menu/navbar/
   dialog all split behaviour (`use-tabs.ts`) from styling (`tabs.tsx`). This keeps a11y correct and the
   markup readable.
7. **Type Poppins, code Geist Mono.** Animate with Motion (`motion/react`), not ad-hoc CSS unless it's a
   trivial `transition-colors`.

## Design tokens (memorise these exact values)

```css
/* Dark-only theme. Define on :root AND .dark identically. */
--background:  #000000;               /* page bg            → bg-black */
--foreground:  #ffffff;               /* primary text       → text-white */
--surface:     #0a0a0a;               /* raised surface     */
--surface-alt: #141414;               /* secondary surface  */
--border:      rgba(255,255,255,0.12);/* default border     → border-white/10–20 */
--muted:       rgba(255,255,255,0.6); /* secondary text     → text-white/60 */
--accent:      #ffffff;               /* emphasis           */
```

Opacity ladder used everywhere — internalise it:

| Token | Class | Use |
|---|---|---|
| 100% white | `text-white` | primary text, active state |
| 85–80% | `text-white/80` | body copy |
| 60% | `text-white/60` | secondary/meta text |
| 40–50% | `text-white/40` `placeholder:text-white/30` | placeholders, very muted |
| border 20% | `border-white/20` | interactive element borders |
| border 10–15% | `border-white/10` | card/subtle borders |
| bg 10% | `bg-white/10` | hover/active fill |
| bg 5% | `bg-white/5` | subtle hover fill |

- **Type:** Poppins 400 (body), Geist Mono (code/mono). Headings `font-semibold` (600). Tight tracking on
  headings/brand (`tracking-tight`). Body is `text-[15px] leading-7`.
- **Spacing:** Tailwind defaults. Buttons `px-3 py-1.5` (sm) / `px-4 py-2` (md). Cards `p-5 gap-3`. Badges
  `px-2 py-0.5`. Inputs `px-3 py-1.5`.
- **Radius:** none. **Shadows:** almost none — `hover:shadow-sm` at most.
- **Scrollbars:** hidden site-wide (functional, just invisible). See setup.

Full bootstrap (theme.css, fonts, Tailwind v4 `@theme inline`, scrollbar CSS, `cn` util) is in
`references/setup.md` — read it when starting a new project or wiring globals.

## The `cn()` helper — used in every component

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## The variant pattern (no cva)

```tsx
export type ButtonVariant = "solid" | "outline" | "dashed" | "ghost" | "link";

const variantClass: Record<ButtonVariant, string> = {
  solid:   "bg-white text-black hover:bg-white/90",
  outline: "border border-white/20 text-white hover:bg-white/5",
  dashed:  "border border-dashed border-white/20 text-white/70 hover:text-white hover:bg-white/5",
  ghost:   "text-white hover:bg-white/10 hover:shadow-sm",
  link:    "text-white underline-offset-4 hover:underline",
};

// at the call site, className always comes last so callers can override:
className={cn("shared base classes", variantClass[variant], className)}
```

## Component conventions at a glance

- **UI primitives → named exports** (`export function Button`). **Pages/route files → default export**.
  `Select` is the one historical default-export primitive; keep it consistent if editing it.
- **Compound components**: a parent plus named slot sub-components, e.g. `Card` + `CardHeader` /
  `CardTitle` / `CardMeta` / `CardBody` / `CardActions`. Don't invent monolithic prop-bag cards.
- **Forms inputs** use `React.forwardRef` + `displayName` and extend the native attribute type. Most
  other components don't need a ref.
- **`background?: string`** is the standard escape hatch prop on many components for a dynamic CSS bg.
- **`"use client"`** only on interactive components; pages stay server components and `await` their
  `params`/`searchParams` (Next 15+/16).
- **Accessibility is non-negotiable** and mostly lives in the headless hooks: roving tabindex, arrow/
  Home/End keys, `role`/`aria-*`, focus trap + restore in dialogs, `aria-hidden` on decorative icons,
  `sr-only` live regions for copy feedback.
- Icons: `lucide-react`. Class merge: `cn()`. Animation: `motion`. That's the standard kit.

Full code conventions (imports, quotes, naming, comment style, Motion idioms, a11y recipes) are in
`references/conventions.md`.

## How to use this skill

- **Building any UI** → apply "The law" + tokens above directly. Pull the right component from
  `references/components.md`.
- **Need a component's exact API or want to know what exists** → `references/components.md` (full
  inventory of 40+ components, one-line descriptions, install commands, usage snippets).
- **Need to recreate a primitive verbatim** (CLI not wired up, or editing the library itself) →
  `references/primitives.md` has the exact source for Button, Input, Textarea, Badge, Card, Tabs +
  useTabs, Select, and Dialog. Match these patterns when authoring new ones.
- **Starting a new project / wiring globals** → `references/setup.md`.
- **Authoring a new component or unsure about code style** → `references/conventions.md`.

## Getting Chrome components into a project

Components are distributed copy-paste via a CLI (shadcn-style: you own the code after install):

```bash
bunx @justin06lee/chrome@latest init        # sets up theme.css + cn() util
bunx @justin06lee/chrome@latest add button   # vendors the component into the project
```

Installed components live under `components/chrome/` and import `@/lib/utils` (the `cn` helper) and
`@/hooks/use-*` (headless hooks). If the CLI isn't available, hand-vendor from `references/primitives.md`
and keep the same file layout.
