import { cn } from "@/lib/utils";

export type MeterProps = {
  value: number;
  max: number;
  /** Accessible name — the bar is a progressbar, not decoration. */
  label: string;
  className?: string;
};

/**
 * A thin square progress bar. Square corners and a translucent border are the
 * whole look — hierarchy comes from the fill, not from a radius or a shadow.
 * A zero `max` renders an empty bar rather than dividing by zero.
 */
export function Meter({ value, max, label, className }: MeterProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden border border-white/15 bg-white/[0.04]", className)}
    >
      <div className="h-full bg-white transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
