# Chrome component inventory (@justin06lee/chrome)

The complete library. **Reach for these before hand-rolling anything.** Each ships copy-paste via the CLI
(`bunx @justin06lee/chrome@latest add <name>`) and lands in `components/chrome/`. Descriptions are the
authoritative one-liners from each component's registry metadata.

For exact source of the core primitives (to vendor by hand or to match when authoring new ones), see
`primitives.md`.

## Contents
- [Forms & inputs](#forms--inputs)
- [Buttons & chips](#buttons--chips)
- [Layout & containers](#layout--containers)
- [Navigation](#navigation)
- [Overlays](#overlays)
- [Content & markdown](#content--markdown)
- [Data display](#data-display)
- [Effects](#effects)
- [Common usage snippets](#common-usage-snippets)

## Forms & inputs

| Component | What it is |
|---|---|
| `Input` | Minimal text input. Thin border, square corners. Extends native input attrs; `forwardRef`. |
| `Textarea` | Minimal multiline input. Matches Input — thin border, square corners, vertical resize. |
| `Select` | Headless dropdown/listbox with palette-swatch support, arrow/Home/End keys, disabled-skip. Generic `<T extends string \| number>`. **Default export.** |
| `Combobox` | Searchable select with optional colour swatches, inline create, and clear. Behaviour in `useCombobox`. |
| `CategoryPicker` | Searchable dropdown of colour-coded items, click-outside + escape close, optional inline create. Controlled, domain-agnostic. |
| `InlineEdit` | Blur-to-save editable field; local draft, commit on blur/Enter, pending state, rollback on error, Escape cancels. Behaviour in `useInlineEdit`. |
| `Range` | Thin minimal slider — native input, custom 12px thumb on a 2px track, thumb scales on hover (CSS pseudo-elements). |
| `ColorSwatch` / `ColorSwatchPicker` | Fixed-palette colour chip + controlled palette picker with a muted default palette and next-unused-color helper. |
| `LoginForm` | Styled credential form with loading/error/rate-limited states and enter-to-submit. Transport-agnostic via injected `onSubmit`; behaviour in `useLoginForm`. |

## Buttons & chips

| Component | What it is |
|---|---|
| `Button` | Polymorphic button, 5 variants (`solid`/`outline`/`dashed`/`ghost`/`link`), `sm`/`md`, icon-only/text/icon+text, optional hover tooltip, click-to-clipboard. Renders `<a>` when given `href`, else `<button>`. |
| `Badge` | Small chip; static label by default, pass `onClick` to make it a toggle/filter chip (`active` swaps to the solid look). Variants `outline`/`solid`/`ghost`. |
| `Segmented` | Controlled segmented control — a row of mutually exclusive options, active one bordered. Compact uppercase variant for mode toggles. |
| `CopyButton` | Copy-to-clipboard button with copied/error feedback states. |
| `Tooltip` | White slide-up pill on hover/keyboard focus. Pure CSS, wraps any trigger. `aria-hidden` — label the trigger itself. |

## Layout & containers

| Component | What it is |
|---|---|
| `Card` + `CardHeader` / `CardTitle` / `CardMeta` / `CardBody` / `CardActions` | Compositional bordered card. Square corners, thin border, dark-only. Title can be a link. |
| `Stack` | Stacked paper card with a hovered fan-out spring animation. |
| `Showcase` (+ `Row`) | Framed preview container with a dotted background for demos; optional label, source caption, note. |
| `Accordion` + `AccordionItem` | Collapsible rows on native `<details>/<summary>` with a rotating chevron; share a `name` across items for one-open-at-a-time. Zero JS state. |

## Navigation

| Component | What it is |
|---|---|
| `Navbar` | Fixed top nav: inline desktop links + hamburger slide-in panel below `md`. Caller supplies routes; behaviour in `useNavbar` (outside-click/Escape close, body scroll lock). |
| `Tabs` | Bordered pill tab-strip. Controlled selection, roving tabindex, arrow-key nav, ARIA. Behaviour in `useTabs`. |
| `Menu` | Action dropdown — trigger opening a list of items each running its `onSelect`; optional selected markers. Behaviour in `useMenu`. |
| `Toc` | Sticky table-of-contents with scroll-spy via IntersectionObserver. Behaviour in `useToc`. |

## Overlays

| Component | What it is |
|---|---|
| `Dialog` (`DialogProvider` + `useDialog`) | Promise-based `confirm()` / `alert()`. Focus trap + restore, Escape closes, danger styling. Wrap app in `DialogProvider`, call `const { confirm, alert } = useDialog()`. |
| `Sheet` | Animated slide-in panel from a screen edge with a dimmed backdrop; closes on backdrop click/Escape/close button, locks body scroll. |

## Content & markdown

| Component | What it is |
|---|---|
| `Prose` | Markdown renderer with the house prose styling — GFM, KaTeX math, heading slugs, copy-on-hover code blocks. Dark-only. Markdown passed as the string child. |
| `Article` | Article reading layout — back link, banner, title, date + tags, then a body slot with staggered fade-ins. Pair with `Prose`. |
| `CollapsibleProse` | Long-form layout splitting markdown into collapsible `<details>` sections on each `##`. Bring your own renderer (typically `Prose`). |
| `Editor` | Split-pane markdown editor with a live preview that scrolls/highlights in sync both ways. Bring your own renderer. Behaviour in `use-line-sync`. |
| `CodeBlock` | Syntax-highlighted code box with a built-in copy button. Monochrome Prism theme tuned for black bg; common langs bundled (tsx/ts/jsx/js/bash/json/css/markup). |
| `Toc` | (see Navigation) |

## Data display

| Component | What it is |
|---|---|
| `Calendar` | Month date grid — selectable days, today ring, prev/next header, Sunday-aligned. `renderDay` to layer dots/counts. |
| `Timeline` | Day schedule — 24h vertical axis with positioned event blocks and an optional live now-line. |
| `Heatmap` | Year activity grid — 12 mini month grids tinted by value (contribution-graph style) with a less→more legend. |
| `Donut` | Spinning ASCII torus baked off-thread in a shared web worker and replayed as a seamless loop. Multiple donuts share one bake. |
| `Pfp` | Profile-picture tile — image in a bordered square that tilts in 3D and sweeps a shine on hover. Frame with `x`/`y`/`scale`. |
| `Socials` | Row of social links; pass a links map, only supplied platforms render. White slide-up tooltip; email entry copies to clipboard. |
| `AssetSidebar` | Scrollable image/asset sidebar; drag a row into a textarea or click insert; optional drop zone for uploads. |

## Effects

| Component | What it is |
|---|---|
| `Tilt` | 3D perspective tilt card with a sweeping shine on hover (Web Animations API). |
| `Scramble` | Wrapper that scrambles every word inside it on hover. |
| `Rainbow` | Wrapper that cycles every character through a staggered rainbow. |
| `Chrome` | Wrapper that renders every text glyph inside it as shimmering chrome foil. |

> Effects are accents — the brand sparkle (Tilt on pfp/cards, Scramble/Chrome on a hero word). Use
> sparingly; the default surface is flat and quiet.

## Common usage snippets

```tsx
import { Button } from "@/components/chrome/button";
import { Card, CardHeader, CardTitle, CardMeta, CardBody, CardActions } from "@/components/chrome/card";
import { Badge } from "@/components/chrome/badge";
import { Tabs } from "@/components/chrome/tabs";
import Select from "@/components/chrome/select";
import { useDialog } from "@/components/chrome/dialog";
import { ArrowRight, Github } from "lucide-react";

// Button — outline is the default; solid is the loud one
<Button>Default outline</Button>
<Button variant="solid" iconRight={ArrowRight}>Continue</Button>
<Button variant="ghost" icon={Github} label="GitHub" href="https://github.com/..." />  // icon-only needs label
<Button variant="link" copy="hi@example.com" copyFeedback="Copied!">hi@example.com</Button>

// Card — compose the slots; don't pass a giant prop bag
<Card>
  <CardHeader>
    <CardTitle href="/articles/x">An article</CardTitle>
    <CardMeta>2026</CardMeta>
  </CardHeader>
  <CardBody>One muted line of summary.</CardBody>
  <CardActions><Button size="sm">Read</Button></CardActions>
</Card>

// Badge as a filter chip (toggle)
<Badge onClick={() => toggle(tag)} active={selected.has(tag)}>{tag}</Badge>

// Tabs — controlled; render your own panel by value
const [tab, setTab] = useState<"a" | "b">("a");
<Tabs value={tab} onValueChange={setTab} items={[{ value: "a", label: "One" }, { value: "b", label: "Two" }]} />

// Select — generic, controlled
<Select value={sort} onChange={setSort} ariaLabel="Sort"
  options={[{ value: "new", label: "Newest" }, { value: "old", label: "Oldest" }]} />

// Dialog — promise-based, no JSX modal plumbing at the call site
const { confirm } = useDialog();
if (await confirm({ title: "Delete?", message: "This can't be undone.", danger: true })) deleteIt();
```
