"use client";

import * as React from "react";

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  resetMs?: number;
  labels?: { idle: string; copied: string; error: string };
  /** CSS background applied to the root element. Transparent by default. */
  background?: string;
}

export function CopyButton({
  text,
  resetMs = 2000,
  labels = { idle: "copy", copied: "copied", error: "failed" },
  className = "",
  children,
  background,
  style,
  ...rest
}: CopyButtonProps) {
  const [state, setState] = React.useState<"idle" | "copied" | "error">("idle");
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = async () => {
    try {
      // Guard for insecure contexts / unsupported browsers where the Clipboard
      // API is absent — route those to the error state instead of throwing late.
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState("idle"), resetMs);
  };

  const label =
    state === "copied" ? labels.copied : state === "error" ? labels.error : labels.idle;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          "font-mono text-[11px] text-white/55 hover:text-white transition-colors " +
          className
        }
        style={{ background, ...style }}
        {...rest}
      >
        {children ?? label}
      </button>
      {/* Announce copy result independently of the button's own label, which is
          an unreliable live region while it also receives focus. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? labels.copied : state === "error" ? labels.error : ""}
      </span>
    </>
  );
}
