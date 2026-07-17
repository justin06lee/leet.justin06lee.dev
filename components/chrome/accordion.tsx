import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccordionProps = {
  className?: string;
  children?: React.ReactNode;
};

/** Container for AccordionItem rows. */
export function Accordion({ className, children }: AccordionProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Subtle open/close animation on native <details>. ::details-content +
          interpolate-size lets height: auto transition; browsers without
          interpolate-size just snap (graceful degradation). */}
      <style precedence="default" href="chrome-accordion-styles">{`
        .chrome-accordion {
          interpolate-size: allow-keywords;
        }
        .chrome-accordion::details-content {
          height: 0;
          overflow: hidden;
          transition: height 180ms ease-out, content-visibility 180ms allow-discrete;
        }
        .chrome-accordion[open]::details-content {
          height: auto;
        }
      `}</style>
      {children}
    </div>
  );
}

export type AccordionItemProps = {
  title: React.ReactNode;
  /** Open on first render. */
  defaultOpen?: boolean;
  /** Group name — set the same value on sibling items to make them exclusive. */
  name?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Single collapsible row built on native <details>/<summary> — open state is the
 * browser's, no JS. The chevron rotates via `group-open`. Pass the same `name`
 * to several items for accordion (one-open-at-a-time) behavior.
 */
export function AccordionItem({
  title,
  defaultOpen,
  name,
  className,
  children,
}: AccordionItemProps) {
  return (
    <details name={name} open={defaultOpen} className={cn("chrome-accordion group border-b border-white/10", className)}>
      <summary className="flex cursor-pointer select-none list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 text-white/40 transition-transform group-hover:text-white/70 group-open:rotate-90"
          aria-hidden
        />
        <span className="flex-1 text-sm font-medium text-white">{title}</span>
      </summary>
      <div className="pb-3 pl-7 text-sm leading-7 text-white/70">{children}</div>
    </details>
  );
}
