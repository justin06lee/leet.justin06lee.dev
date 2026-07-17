import { FadeIn } from "@/components/chrome/fade-in";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  /** Small mono kicker above the title, e.g. the tier or section name. */
  eyebrow?: string;
  title: string;
  /** Muted line under the title. */
  subtitle?: string;
  /** Right-hand slot for actions. */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * The standard page header: optional mono kicker, mono title, muted subtitle.
 * Every top-level page opens with one so headers never drift apart.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <FadeIn
      as="header"
      className={cn("flex flex-wrap items-end justify-between gap-4", className)}
    >
      <div className="flex flex-col gap-2">
        {eyebrow ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-white/50">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </FadeIn>
  );
}
