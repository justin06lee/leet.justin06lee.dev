"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** Smaller, uppercase tracking variant (mode toggle). */
  size?: "default" | "compact";
  className?: string;
  ariaLabel?: string;
};

/**
 * Controlled segmented control — a row of mutually exclusive options. The
 * active segment gets a border; the rest stay muted. Generalized from the
 * justin06lee.dev "now / backfill" mode toggle.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "default",
  className,
  ariaLabel,
}: SegmentedProps<T>) {
  const pad =
    size === "compact"
      ? "px-1.5 py-0.5 text-[10px] uppercase tracking-widest"
      : "px-3 py-1.5 text-sm";

  return (
    <div role="group" aria-label={ariaLabel} className={cn("inline-flex items-center gap-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "border transition-colors",
              pad,
              active
                ? "border-white/40 text-white"
                : "border-transparent text-white/40 hover:text-white/70",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
