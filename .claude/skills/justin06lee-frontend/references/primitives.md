# Core primitives — exact source

Verbatim source for the foundational Chrome components. Two uses:

1. **Vendor by hand** when the CLI isn't available — drop into `components/chrome/`, keep imports
   (`@/lib/utils`, `@/hooks/use-*`) or rewrite to relative paths.
2. **Match these patterns** when authoring any new component so it reads like the rest of the library.

All assume `cn` from `references/setup.md` and `lucide-react` for icons.

## Table of contents
- [Button](#button)
- [Input](#input)
- [Textarea](#textarea)
- [Badge](#badge)
- [Card (compound)](#card-compound)
- [Tabs + useTabs (headless pattern)](#tabs--usetabs-headless-pattern)
- [Select (generic listbox)](#select-generic-listbox)
- [Dialog (promise-based, context)](#dialog-promise-based-context)

---

## Button

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "solid" | "outline" | "dashed" | "ghost" | "link";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  /** White slide-up pill shown on hover. */
  tooltip?: string;
  /** aria-label override; required for icon-only buttons. */
  label?: string;
  /** Renders as <a>; external URLs (http(s)://) get target="_blank" auto-applied. */
  href?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  fullWidth?: boolean;
  /** CSS background applied to the root element. Transparent by default. */
  background?: string;
  /** When set, click copies this string to the clipboard. */
  copy?: string;
  /** Swaps into tooltip (and into children if children is a string) for 1.5s after copy. Defaults to "Copied!". */
  copyFeedback?: string;
  ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
};

const SIZE = {
  sm: { icon: "size-9", text: "px-3 py-1.5 text-sm" },
  md: { icon: "size-10", text: "px-4 py-2 text-sm" },
} as const;

const variantClass: Record<ButtonVariant, string> = {
  solid: "bg-white text-black hover:bg-white/90",
  outline: "border border-white/20 text-white hover:bg-white/5",
  dashed:
    "border border-dashed border-white/20 text-white/70 hover:text-white hover:bg-white/5",
  ghost: "text-white hover:bg-white/10 hover:shadow-sm",
  link: "text-white underline-offset-4 hover:underline",
};

export function Button({
  variant = "outline",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  tooltip,
  label,
  href,
  onClick,
  className,
  children,
  type = "button",
  disabled,
  fullWidth,
  background,
  copy,
  copyFeedback = "Copied!",
  ref,
}: ButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const iconOnly = !children;
  const isLink = variant === "link";
  const hasIcon = Boolean(Icon || IconRight);
  const iconPx = !isLink && iconOnly ? (size === "sm" ? 20 : 18) : 16;

  const showFeedback = copy && copied;
  const tooltipShown = showFeedback ? copyFeedback : tooltip;
  const childrenShown =
    showFeedback && typeof children === "string" ? copyFeedback : children;

  const handleClick = async () => {
    if (copy) {
      try {
        await navigator.clipboard.writeText(copy);
        setCopied(true);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), 1500);
      } catch {
        /* clipboard blocked */
      }
    }
    onClick?.();
  };

  const cls = cn(
    "group relative inline-flex items-center transition",
    disabled
      ? "opacity-60 cursor-not-allowed pointer-events-none"
      : "cursor-pointer",
    !isLink && SIZE[size][iconOnly ? "icon" : "text"],
    iconOnly && !isLink && "justify-center",
    hasIcon && !iconOnly && (isLink ? "gap-1.5" : "gap-2"),
    fullWidth && "w-full justify-center",
    variantClass[variant],
    className,
  );

  // Icon-only buttons have no visible text, so they need an accessible name:
  // prefer an explicit `label`, then fall back to `tooltip`.
  const ariaLabel = iconOnly ? (label ?? tooltip) : undefined;

  const content = (
    <>
      {tooltipShown && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 whitespace-nowrap bg-white px-2 py-1 text-[11px] text-black opacity-0 [transform:translate(-50%,4px)] transition-[opacity,transform] duration-150 group-hover:opacity-100 group-hover:[transform:translate(-50%,-4px)]">
          {tooltipShown}
        </span>
      )}
      {Icon && <Icon size={iconPx} aria-hidden />}
      {childrenShown}
      {IconRight && <IconRight size={iconPx} aria-hidden />}
    </>
  );

  if (href && !copy && !disabled) {
    const external = /^https?:\/\//.test(href);
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        aria-label={ariaLabel}
        className={cls}
        style={{ background }}
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cls}
      style={{ background }}
    >
      {content}
    </button>
  );
}
```

---

## Input

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** CSS background applied to the root element. Transparent by default. */
  background?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, background, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "bg-transparent border border-white/20 px-3 py-1.5 text-sm text-white",
        "placeholder:text-white/30 focus:outline-none focus:border-white/50",
        "disabled:opacity-50",
        className,
      )}
      style={{ ...style, background }}
      {...props}
    />
  ),
);
Input.displayName = "Input";
```

---

## Textarea

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** CSS background applied to the element. Transparent by default. */
  background?: string;
}

/** Minimal multiline input. Matches Input — thin border, square corners. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, background, style, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full resize-y bg-transparent border border-white/20 px-3 py-2 text-sm text-white",
        "placeholder:text-white/30 focus:outline-none focus:border-white/50",
        "disabled:opacity-50",
        className,
      )}
      style={{ ...style, background }}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
```

---

## Badge

```tsx
import { cn } from "@/lib/utils";

export type BadgeVariant = "outline" | "solid" | "ghost";

export type BadgeProps = {
  variant?: BadgeVariant;
  /** When set, renders as a toggle button (e.g. a filter chip). */
  onClick?: () => void;
  /** Toggle state for the ghost/filter use case — drives the active styling. */
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const variantClass: Record<BadgeVariant, string> = {
  outline: "border border-white/15 text-white/80",   // tech tag
  solid: "bg-white text-black",                        // selected / emphasis
  ghost: "text-white/60 hover:bg-white/10 hover:text-white", // filter chip
};

export function Badge({
  variant = "outline",
  onClick,
  active = false,
  className,
  children,
}: BadgeProps) {
  const cls = cn(
    "inline-flex items-center px-2 py-0.5 text-xs transition-colors",
    active ? variantClass.solid : variantClass[variant],
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}
```

---

## Card (compound)

The compound pattern: one shell + named slots. Note exact slot classes.

```tsx
import { cn } from "@/lib/utils";

export type CardProps = {
  className?: string;
  children?: React.ReactNode;
  background?: string;
};

/** Bordered container. Square corners, thin border, dark-only. */
export function Card({ className, children, background }: CardProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 border border-white/10 p-5", className)}
      style={{ background }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, href }: { className?: string; children?: React.ReactNode; href?: string }) {
  const heading = (
    <h3 className={cn("text-lg font-semibold leading-tight", className)}>{children}</h3>
  );
  if (!href) return heading;
  const external = /^https?:\/\//.test(href);
  return (
    <a href={href} className="underline-offset-4 hover:underline"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}>
      {heading}
    </a>
  );
}

/** Muted, shrink-proof meta slot — e.g. a year pinned to the right of the header. */
export function CardMeta({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <span className={cn("shrink-0 select-none text-xs text-white/60", className)}>{children}</span>;
}

export function CardBody({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <p className={cn("text-sm text-white/80", className)}>{children}</p>;
}

/** Footer row for links/buttons. */
export function CardActions({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("mt-3 flex items-center gap-2", className)}>{children}</div>;
}
```

---

## Tabs + useTabs (headless pattern)

The reference example of the **behaviour-in-a-hook, styling-in-the-component** split. Copy this shape for
any new interactive component (menu, select, combobox, navbar all follow it).

**`hooks/use-tabs.ts`** — pure behaviour, ARIA, roving tabindex, arrow/Home/End:

```ts
"use client";

import { useId, useRef, type KeyboardEvent } from "react";

export type TabItem<T extends string> = { value: T; label: string; disabled?: boolean };

export type UseTabsOptions<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  items: TabItem<T>[];
  loop?: boolean; // loop focus past the ends; default true
};

export type TabProps = {
  id: string;
  role: "tab";
  "aria-selected": boolean;
  "aria-controls": string;
  tabIndex: number;
  disabled?: boolean;
  ref: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
};

export type UseTabsReturn<T extends string> = {
  tabListProps: { role: "tablist"; onKeyDown: (e: KeyboardEvent) => void };
  getTabProps: (value: T) => TabProps;
  getPanelId: (value: T) => string;
};

export function useTabs<T extends string>({
  value,
  onValueChange,
  items,
  loop = true,
}: UseTabsOptions<T>): UseTabsReturn<T> {
  const baseId = useId();
  const refs = useRef(new Map<T, HTMLButtonElement | null>());

  const tabId = (v: T) => `${baseId}-tab-${v}`;
  const panelId = (v: T) => `${baseId}-panel-${v}`;
  const enabled = items.filter((i) => !i.disabled);

  const focusValue = (v: T) => {
    onValueChange(v);
    refs.current.get(v)?.focus();
  };

  const move = (dir: 1 | -1) => {
    if (enabled.length === 0) return;
    const idx = enabled.findIndex((i) => i.value === value);
    const from = idx === -1 ? (dir === 1 ? -1 : enabled.length) : idx;
    let next = from + dir;
    if (next < 0) next = loop ? enabled.length - 1 : 0;
    if (next > enabled.length - 1) next = loop ? 0 : enabled.length - 1;
    const target = enabled[next];
    if (target) focusValue(target.value);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        if (enabled[0]) focusValue(enabled[0].value);
        break;
      case "End":
        e.preventDefault();
        if (enabled[enabled.length - 1]) focusValue(enabled[enabled.length - 1]!.value);
        break;
    }
  };

  return {
    tabListProps: { role: "tablist", onKeyDown },
    getTabProps: (v: T): TabProps => ({
      id: tabId(v),
      role: "tab",
      "aria-selected": v === value,
      "aria-controls": panelId(v),
      tabIndex: v === value ? 0 : -1,
      disabled: items.find((i) => i.value === v)?.disabled,
      ref: (el) => {
        if (el) refs.current.set(v, el);
        else refs.current.delete(v);
      },
      onClick: () => onValueChange(v),
    }),
    getPanelId: panelId,
  };
}
```

**`components/chrome/tabs.tsx`** — styling only:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { useTabs, type TabItem } from "@/hooks/use-tabs";

export type { TabItem } from "@/hooks/use-tabs";

export type TabsProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  items: TabItem<T>[];
  className?: string;
  loop?: boolean;
};

export function Tabs<T extends string>({ value, onValueChange, items, className, loop }: TabsProps<T>) {
  const { tabListProps, getTabProps } = useTabs({ value, onValueChange, items, loop });

  return (
    <div {...tabListProps} className={cn("flex gap-2", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            {...getTabProps(item.value)}
            className={cn(
              "whitespace-nowrap border px-3 py-1.5 text-sm transition-colors",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50",
              item.disabled && "cursor-not-allowed opacity-40",
              active
                ? "border-white text-white"
                : "border-white/20 text-white/60 hover:border-white/50 hover:text-white",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
```

---

## Select (generic listbox)

Generic over `T extends string | number`. Closes on outside-click / Escape (Escape on the capture phase
with `stopImmediatePropagation` so a Select inside a modal doesn't also close the modal). Note: **default
export** — `import Select from "@/components/chrome/select"`.

```tsx
"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  /** Optional node rendered before the label — e.g. a color swatch. */
  prefix?: ReactNode;
  disabled?: boolean;
};

type Props<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  size?: "default" | "compact";
  background?: string;
};

export default function Select<T extends string | number>({
  value, onChange, options, placeholder, disabled, ariaLabel, className,
  size = "default", background,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const optionId = (i: number) => `${baseId}-option-${i}`;

  // Outside-click + Escape close, only while open. Escape uses the capture phase
  // + stopImmediatePropagation so a Select nested in a Dialog doesn't also close it.
  useEffect(() => {
    if (!open) { setActiveIndex(-1); return; }
    const selectedIndex = options.findIndex((o) => o.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);

    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent | globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        (e as globalThis.KeyboardEvent).stopImmediatePropagation();
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey as EventListener, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey as EventListener, true);
    };
  }, [open, options, value]);

  const selected = options.find((o) => o.value === value);
  const trigger = size === "compact" ? "px-2 py-0.5 text-xs" : "px-2 py-1 text-sm";

  return (
    <div ref={containerRef} className={className} style={{ background }}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 border border-white/20 text-white ${trigger} disabled:opacity-50`}
      >
        <span className="flex items-center gap-2">
          {selected?.prefix}
          {selected ? selected.label : <span className="text-white/30">{placeholder}</span>}
        </span>
      </button>
      {open && (
        <div role="listbox" aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          className="mt-1 border border-white/20 bg-black">
          {options.map((o, i) => (
            <button
              key={String(o.value)}
              id={optionId(i)}
              role="option"
              aria-selected={o.value === value}
              disabled={o.disabled}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10 disabled:opacity-40 ${
                o.value === value ? "text-white" : "text-white/70"
              }`}
            >
              {o.prefix}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

> The Select listbox markup above is a faithful reconstruction of the API and styling. If you have the
> CLI, prefer `bunx @justin06lee/chrome@latest add select` to get the exact upstream file.

---

## Dialog (promise-based, context)

Imperative `confirm`/`alert` returning Promises — no per-call-site JSX modal plumbing. Wrap the app in
`DialogProvider`, then `const { confirm, alert } = useDialog()`.

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ConfirmOptions = { title: string; message?: string; confirmText?: string; cancelText?: string; danger?: boolean };
type AlertOptions = { title: string; message?: string; okText?: string };

type DialogState =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "alert"; options: AlertOptions; resolve: () => void }
  | null;

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}

// Subtle entrance — just enough to avoid a hard flicker.
const DIALOG_KEYFRAMES = `@keyframes chrome-dialog-overlay { from { opacity: 0; } to { opacity: 1; } }
@keyframes chrome-dialog-panel { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(null);
  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ kind: "confirm", options, resolve })),
    [],
  );
  const alert = useCallback(
    (options: AlertOptions) => new Promise<void>((resolve) => setState({ kind: "alert", options, resolve })),
    [],
  );
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = useCallback((resolved: boolean) => {
    setState((s) => {
      if (!s) return null;
      if (s.kind === "confirm") s.resolve(resolved);
      else s.resolve();
      return null;
    });
  }, []);

  // Focus management: remember focus on open, restore on close. Escape closes.
  useEffect(() => {
    if (!state) { previouslyFocused.current?.focus(); return; }
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, close]);

  const isDanger = state?.kind === "confirm" && state.options.danger === true;

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {state && (
        <>
          <style precedence="default" href="chrome-dialog-keyframes">{DIALOG_KEYFRAMES}</style>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
            style={{ animation: "chrome-dialog-overlay 120ms ease-out" }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="chrome-dialog-title"
              className="w-full max-w-sm space-y-4 border border-white/20 bg-black p-5"
              style={{ animation: "chrome-dialog-panel 150ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
            >
              <h2 id="chrome-dialog-title" className="text-lg font-semibold text-white">
                {state.options.title}
              </h2>
              {state.options.message && (
                <p className="text-sm text-white/60">{state.options.message}</p>
              )}
              <div className="flex justify-end gap-2">
                {state.kind === "confirm" && (
                  <button
                    type="button"
                    onClick={() => close(false)}
                    className="border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/5"
                  >
                    {state.options.cancelText ?? "Cancel"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={
                    isDanger
                      ? "border border-red-400/60 px-3 py-1.5 text-sm text-red-300 hover:bg-red-400/10"
                      : "bg-white px-3 py-1.5 text-sm text-black hover:bg-white/90"
                  }
                >
                  {state.kind === "confirm"
                    ? (state.options.confirmText ?? "Confirm")
                    : (state.options.okText ?? "OK")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DialogContext.Provider>
  );
}
```

> The Dialog above reconstructs the API, styling, animation keyframes, and focus/Escape behaviour. The
> upstream version adds a full Tab focus-trap loop inside the panel; prefer the CLI
> (`add dialog`) for the exact file when available.
