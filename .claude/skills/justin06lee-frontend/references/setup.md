# Project setup & globals

How to stand up a new project so it matches the house style, or to wire globals into an existing one.

## Stack (the defaults — don't deviate without reason)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) 15/16, React 19 |
| Language | TypeScript, `strict: true` |
| Styling | Tailwind CSS **v4** via `@tailwindcss/postcss` (no `tailwind.config.js` — theme is inline in CSS) |
| Class merge | `clsx` + `tailwind-merge` → `cn()` |
| Animation | `motion` (Motion, formerly Framer Motion) |
| Icons | `lucide-react` |
| Package manager / runtime | **Bun** (`bun install`, `bunx`, `bun run`) |
| Lint | ESLint 9 flat config (`eslint.config.mjs`), extends `next/core-web-vitals` + `next/typescript`. No Prettier — ESLint is the formatter of record. |
| Test | Vitest |
| DB (when needed) | LibSQL / Turso (`@libsql/client`) |
| Markdown | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` (+ `rehype-slug`) |
| Code highlight | `prism-react-renderer` |

`tsconfig.json` essentials: `"strict": true`, `"jsx": "react-jsx"` (or `"preserve"` for Next), path alias
`"@/*"` → `./src/*` (or project root in some apps — match the existing app).

## Quickest path: the Chrome CLI

```bash
bunx @justin06lee/chrome@latest init       # writes theme.css + lib/utils.ts (cn)
bunx @justin06lee/chrome@latest add card    # vendor components as needed
```

`init` installs the theme and the `cn` helper; `add` copies a component (and its registry deps, e.g.
`utils`) into the project. You own the code afterward — edit freely.

## Manual bootstrap (when not using the CLI)

### 1. `cn()` helper — `lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 2. Theme + globals — `app/globals.css`

This is the canonical theme block, verbatim. Tailwind v4 maps CSS vars to utilities via `@theme inline`,
so `--color-foreground` becomes `text-foreground`, etc. Note dark values live on BOTH `:root` and `.dark`.

```css
@import "tailwindcss";

:root,
.dark {
  --background: #000000;
  --foreground: #ffffff;
  --surface: #0a0a0a;
  --surface-alt: #141414;
  --border: rgba(255, 255, 255, 0.12);
  --muted: rgba(255, 255, 255, 0.6);
  --accent: #ffffff;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-alt: var(--surface-alt);
  --color-border: var(--border);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --font-sans: var(--font-poppins); /* or: "Poppins", sans-serif */
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
}

/* Hide scrollbars site-wide while keeping scroll functional. A deliberate look. */
* {
  scrollbar-width: none;     /* Firefox */
  -ms-overflow-style: none;  /* IE/legacy Edge */
}
*::-webkit-scrollbar {
  display: none;             /* Chrome, Safari, Edge */
}
```

### 3. Fonts

Two interchangeable approaches; pick one:

**A. CDN `@font-face` (used by the Chrome library)** — drop into the theme CSS:

```css
@font-face {
  font-family: "Poppins";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.woff2")
    format("woff2");
}
```

**B. `next/font` (used by the .dev apps)** — Geist Mono from Google, Poppins self-hosted/local:

```tsx
// app/layout.tsx
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const poppins = localFont({ src: "../public/Poppins-Regular.ttf", variable: "--font-poppins" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${geistMono.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}
```

Body font is Poppins; mono/code is Geist Mono. Pin font versions if a page renders ASCII art (font
re-rasterisation shifts monospace glyph metrics).

### 4. Tailwind v4 content note

There is no `tailwind.config.js`. In a monorepo where components live outside the app root, add an
explicit `@source` so their classes aren't purged:

```css
@source "../../../packages/registry";
```

## Page scaffold pattern

```tsx
// app/some/page.tsx — server component by default
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;          // Next 15+/16: params/searchParams are Promises
  // ...fetch data here (server-side)
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      {/* content */}
    </div>
  );
}
```

Mark `export const dynamic = "force-dynamic"` on data-dependent routes. Add `"use client"` only to
components that need state/effects/events.
