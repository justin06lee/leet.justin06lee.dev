"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/chrome/kbd";

export type PaletteItem = {
  /** Unique key; defaults to href ?? label. */
  id?: string;
  label: string;
  href?: string;
  /** Section header the item is listed under (e.g. "components"). */
  group?: string;
  /** Extra strings the filter also matches against. */
  keywords?: string[];
};

export type CommandPaletteProps = {
  items: PaletteItem[];
  /** Called with the chosen item. Default: follows item.href via window.location. */
  onSelect?: (item: PaletteItem) => void;
  /** Search input placeholder. Default "search…". */
  placeholder?: string;
  /** Key that opens the palette with cmd/ctrl held. Default "k". */
  hotkey?: string;
  /** Controlled visibility (optional; omit for the built-in hotkey flow). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Shown when nothing matches. Default "no results." */
  emptyMessage?: string;
  className?: string;
};

const MAX_RESULTS = 12;

// Label + href, so items sharing a placeholder href (e.g. "#") stay unique.
function itemKey(item: PaletteItem) {
  return item.id ?? `${item.label}:${item.href ?? ""}`;
}

/**
 * Case-insensitive filter over label, group, and keywords; label-prefix
 * matches rank before substring matches. Empty query returns the first
 * MAX_RESULTS items as-is.
 */
function filterItems(items: PaletteItem[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, MAX_RESULTS);
  const prefix: PaletteItem[] = [];
  const substring: PaletteItem[] = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    if (label.startsWith(q)) {
      prefix.push(item);
      continue;
    }
    const haystack = [
      label,
      item.group?.toLowerCase() ?? "",
      ...(item.keywords ?? []).map((k) => k.toLowerCase()),
    ];
    if (haystack.some((h) => h.includes(q))) substring.push(item);
  }
  return [...prefix, ...substring].slice(0, MAX_RESULTS);
}

type Section = { title?: string; items: PaletteItem[] };

/** Group results under their `group` headers, ungrouped items first. */
function toSections(results: PaletteItem[]): Section[] {
  const ungrouped: PaletteItem[] = [];
  const grouped = new Map<string, PaletteItem[]>();
  for (const item of results) {
    if (!item.group) {
      ungrouped.push(item);
      continue;
    }
    const bucket = grouped.get(item.group);
    if (bucket) bucket.push(item);
    else grouped.set(item.group, [item]);
  }
  const sections: Section[] = [];
  if (ungrouped.length > 0) sections.push({ items: ungrouped });
  for (const [title, groupItems] of grouped) sections.push({ title, items: groupItems });
  return sections;
}

/**
 * Spotlight-style command palette: cmd+k (ctrl+k on non-mac) opens a centered
 * floating search bar; type to filter, arrows to move, enter to open, esc to
 * close. Supports both uncontrolled (built-in hotkey flow) and controlled
 * (`open`/`onOpenChange`) usage.
 */
export function CommandPalette({
  items,
  onSelect,
  placeholder = "search…",
  hotkey = "k",
  open: openProp,
  onOpenChange,
  emptyMessage = "no results.",
  className,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  // Whether the last highlight move came from the keyboard — only then do we
  // scroll the row into view (scrolling on mouse hover causes jumpiness).
  const navSource = useRef<"keyboard" | "mouse">("keyboard");
  const baseId = useId();
  const rowId = (index: number) => `${baseId}-option-${index}`;

  const sections = useMemo(() => toSections(filterItems(items, query)), [items, query]);
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  // Global hotkey: cmd/ctrl + hotkey toggles, escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === hotkey.toLowerCase()) {
        e.preventDefault();
        setOpen(!open);
        return;
      }
      if (open && e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, open, setOpen]);

  // Reset the query and highlight each time the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    navSource.current = "keyboard";
  }, [open]);

  // Highlight follows the first result whenever the query changes.
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Body scroll lock — restore the previous value so another overlay's lock
  // isn't clobbered.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Keep the highlighted row visible during keyboard navigation.
  useEffect(() => {
    if (!open || navSource.current !== "keyboard") return;
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const select = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      if (onSelect) onSelect(item);
      else if (item.href) window.location.href = item.href;
    },
    [onSelect, setOpen],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      navSource.current = "keyboard";
      setHighlight((h) => (h + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      navSource.current = "keyboard";
      setHighlight((h) => (h - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[highlight];
      if (item) select(item);
    }
  }

  if (!open) return null;

  // Row indices run across sections in render order; track a running offset.
  let offset = 0;

  return (
    <div className={cn("fixed inset-0 z-[110]", className)}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={placeholder}
        className="relative mx-auto mt-[24vh] w-[min(560px,calc(100vw-2rem))] border border-white/20 bg-black"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="size-4 shrink-0 text-white/40" aria-hidden />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={`${baseId}-listbox`}
            aria-activedescendant={flat.length > 0 ? rowId(highlight) : undefined}
            aria-label={placeholder}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            className="w-full bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <div
          ref={listRef}
          id={`${baseId}-listbox`}
          role="listbox"
          className="max-h-[50vh] overflow-y-auto border-t border-white/10"
        >
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-white/40">{emptyMessage}</div>
          ) : (
            sections.map((section) => {
              const start = offset;
              offset += section.items.length;
              return (
                <div key={section.title ?? "__ungrouped"}>
                  {section.title && (
                    <div className="px-4 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                      {section.title}
                    </div>
                  )}
                  {section.items.map((item, i) => {
                    const index = start + i;
                    return (
                      <button
                        key={itemKey(item)}
                        type="button"
                        id={rowId(index)}
                        data-index={index}
                        role="option"
                        aria-selected={index === highlight}
                        onMouseEnter={() => {
                          navSource.current = "mouse";
                          setHighlight(index);
                        }}
                        onClick={() => select(item)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-white/70",
                          index === highlight && "bg-white/10 text-white",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.href && (
                          <span className="max-w-[40%] truncate font-mono text-[10px] text-white/25">
                            {item.href}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 font-mono text-[10px] text-white/30">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span className="ml-0.5">navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            <span className="ml-0.5">open</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd>
            <span className="ml-0.5">close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
