"use client";

import { Heatmap } from "@/components/chrome/heatmap";

export type ActivityHeatmapProps = {
  /** Reviews per day, keyed "YYYY-MM-DD". Missing days count as zero. */
  values: Record<string, number>;
  year: number;
  /** "YYYY-MM-DD" to ring. */
  today: string;
};

/**
 * The dashboard's year view.
 *
 * A client adapter purely so the tooltip formatter lives on this side of the
 * boundary — Heatmap is a client component, and an inline `title` callback
 * passed from a server page is an unserializable function prop.
 */
export function ActivityHeatmap({ values, year, today }: ActivityHeatmapProps) {
  return (
    <Heatmap
      values={values}
      year={year}
      today={today}
      title={(date, value) => `${date} — ${value} ${value === 1 ? "review" : "reviews"}`}
    />
  );
}
