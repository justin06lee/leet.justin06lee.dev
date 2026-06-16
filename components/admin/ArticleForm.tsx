"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PATTERNS } from "@/lib/toolkit";
import { saveArticleAction, deleteArticleAction, type ArticleInput } from "@/app/admin/actions";
import type { Article } from "@/lib/articles";

const FIELD =
  "rounded border border-border bg-surface px-2 py-1 text-sm text-foreground lowercase";
const BUTTON =
  "rounded border border-border bg-surface px-3 py-1 text-sm text-foreground lowercase hover:border-foreground disabled:opacity-50";

export default function ArticleForm({ initial }: { initial?: Article }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [pattern, setPattern] = useState(initial?.pattern ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: ArticleInput = {
      id: initial?.id,
      title,
      body,
      pattern: pattern || null,
      published,
    };
    startTransition(async () => {
      const result = await saveArticleAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/articles");
      router.refresh();
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    setError(null);
    startTransition(async () => {
      await deleteArticleAction(initial.id);
      router.push("/admin/articles");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4 lowercase">
      {error && (
        <p className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">title</span>
        <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">pattern</span>
        <select className={FIELD} value={pattern} onChange={(e) => setPattern(e.target.value)}>
          <option value="">none</option>
          {PATTERNS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">body</span>
        <textarea
          className={`${FIELD} min-h-80 font-mono normal-case`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        published
      </label>

      <div className="flex items-center gap-2">
        <button type="submit" className={BUTTON} disabled={isPending}>
          {isPending ? "saving…" : "save"}
        </button>
        {initial?.id && (
          <button type="button" className={BUTTON} disabled={isPending} onClick={onDelete}>
            delete
          </button>
        )}
      </div>
    </form>
  );
}
