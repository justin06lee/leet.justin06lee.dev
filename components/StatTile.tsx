"use client";

import { CountUp } from "@/components/chrome/count-up";
import { Card } from "@/components/chrome/card";
import { cn } from "@/lib/utils";

export type StatTileProps = {
  label: string;
  value: number;
  /** Rendered after the number, e.g. "%" or "days". */
  suffix?: string;
  /** Muted line under the number. */
  hint?: string;
  className?: string;
};

/**
 * A single dashboard number. The count-up tweens on scroll-into-view and snaps
 * under prefers-reduced-motion, so this is safe to use in rows.
 */
export function StatTile({ label, value, suffix, hint, className }: StatTileProps) {
  return (
    <Card className={cn("gap-1", className)}>
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
      <CountUp
        value={value}
        suffix={suffix}
        className="font-mono text-3xl tracking-tight text-white"
      />
      {hint ? <span className="text-sm text-white/50">{hint}</span> : null}
    </Card>
  );
}
