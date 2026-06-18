"use client";

import { useEffect, useState } from "react";

export type TocHeading = {
  id: string;
  text: string;
};

/**
 * Headless scroll-spy: observes the elements whose ids are given and returns
 * the id of the one currently in view. No styling. The rootMargin keeps a
 * heading "active" until it scrolls into the top ~30% of the viewport.
 */
export function useToc(headings: TocHeading[], rootMargin = "-80px 0px -70% 0px"): string {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings, rootMargin]);

  return activeId;
}
