"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EditorPreview } from "@/components/chrome/editor-preview";
import { useLineSync, STREAK_PAD, type UseLineSyncReturn } from "@/hooks/use-line-sync";

export interface EditorTextareaProps {
  /** A `useLineSync(...)` return value, shared with the paired `<EditorPreview>`. */
  sync: UseLineSyncReturn;
  /** Markdown source (controlled). */
  value: string;
  /** Called with the next markdown source on edit. */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Sizing/extra classes (give it a height). */
  className?: string;
}

/**
 * The editor half on its own: a `<textarea>` with the gray-streak + "→ preview"
 * button overlay, driven by a `useLineSync` engine. Pair it with a `<EditorPreview>`
 * that shares the same engine and they stay in sync even in separate, non-adjacent
 * containers — the engine aligns by viewport coordinates, not relative layout.
 */
export function EditorTextarea({
  sync,
  value,
  onChange,
  placeholder,
  className,
}: EditorTextareaProps) {
  const {
    textareaRef,
    overlayLayerRef,
    editorScrollTopRef,
    syncedRect,
    selection,
    selectionRect,
    syncToPreview,
    refreshSelection,
    clearSelection,
    handleScroll,
  } = sync;

  return (
    <div className={cn("relative min-h-0 overflow-hidden", className)}>
      <div className="relative h-full min-h-0">
        {/* overlay layer: translated on scroll so streak/button track text 1:1 */}
        <div
          ref={overlayLayerRef}
          className="pointer-events-none absolute inset-0 z-10"
          style={{ transform: `translateY(${-editorScrollTopRef.current}px)` }}
        >
          {syncedRect != null ? (
            <div
              aria-hidden
              className="absolute left-0 right-0 bg-white/10"
              style={{ top: syncedRect.top - STREAK_PAD, height: syncedRect.height + STREAK_PAD * 2 }}
            />
          ) : null}
          {selection != null && selectionRect != null ? (
            <button
              type="button"
              // preventDefault keeps the textarea focused + its selection intact
              onMouseDown={(event) => event.preventDefault()}
              onClick={syncToPreview}
              className="pointer-events-auto absolute right-2 flex items-center gap-1 border border-white/20 bg-black px-2 py-1 text-xs text-white/80 shadow-lg transition-colors hover:bg-white/10 hover:text-white"
              style={{
                top: selectionRect.top,
                transform:
                  selectionRect.top - editorScrollTopRef.current > 28
                    ? "translateY(calc(-100% - 4px))"
                    : "translateY(4px)",
              }}
            >
              {"→ preview"}
            </button>
          ) : null}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onMouseUp={refreshSelection}
          onSelect={refreshSelection}
          onBlur={clearSelection}
          onScroll={(event) => handleScroll(event.currentTarget.scrollTop)}
          spellCheck={false}
          placeholder={placeholder}
          className="h-full w-full resize-none bg-black px-4 py-6 font-mono text-[13px] leading-6 text-white/90 outline-none placeholder:text-white/30 lg:px-8"
        />
      </div>
    </div>
  );
}

export interface EditorProps {
  /** Markdown source (controlled). */
  value: string;
  /** Called with the next markdown source on edit. */
  onChange: (value: string) => void;
  /**
   * Renders the markdown with line-sync enabled — typically
   * `(md, { highlightLine }) => <Prose lineSync highlightLine={highlightLine}>{md}</Prose>`.
   */
  renderMarkdown: (
    markdown: string,
    state: { highlightLine: number | null },
  ) => ReactNode;
  /** Sticky label over the preview pane. Defaults to "live preview". */
  label?: ReactNode;
  /** Editor textarea placeholder. */
  placeholder?: string;
  /** Sizing/extra classes for the root (give it a height). */
  className?: string;
}

/**
 * Turnkey split-pane markdown editor: `EditorTextarea` beside a
 * `<EditorPreview>`, sharing one `useLineSync` engine so the preview scrolls and
 * highlights in sync both ways. Dark-only. Give the root a height. For a custom
 * layout, drop down to `useLineSync` + the two pieces directly.
 */
export function Editor({
  value,
  onChange,
  renderMarkdown,
  label = "live preview",
  placeholder,
  className,
}: EditorProps) {
  const sync = useLineSync({ value });

  return (
    <div className={cn("flex min-h-0 flex-col md:flex-row", className)}>
      <EditorTextarea
        sync={sync}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 border-b border-white/10 md:border-b-0 md:border-r"
      />
      <EditorPreview
        ref={sync.previewRef}
        content={value}
        renderMarkdown={renderMarkdown}
        onSelectBlock={sync.onPreviewSelectBlock}
        label={label}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
