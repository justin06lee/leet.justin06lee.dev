"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PATTERNS } from "@/lib/toolkit";
import { saveArticleAction, deleteArticleAction, type ArticleInput } from "@/app/admin/actions";
import type { Article } from "@/lib/articles";
import { Input } from "@/components/chrome/input";
import Select from "@/components/chrome/select";
import { Button } from "@/components/chrome/button";
import { Editor } from "@/components/chrome/editor";
import { Prose } from "@/components/chrome/prose";

const PATTERN_OPTIONS = [
  { value: "", label: "— none —" },
  ...PATTERNS.map((p) => ({ value: p.key, label: p.label })),
];

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
        <p className="border border-white/20 px-3 py-2 text-sm text-white">{error}</p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">title</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">pattern</span>
        <Select
          value={pattern}
          onChange={(v) => setPattern(v)}
          options={PATTERN_OPTIONS}
          ariaLabel="pattern"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-white/60">body</span>
        <Editor
          className="h-[480px] border border-white/10 normal-case"
          value={body}
          onChange={setBody}
          renderMarkdown={(source, { highlightLine }) => (
            <Prose lineSync highlightLine={highlightLine}>
              {source}
            </Prose>
          )}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-white/60">
        <input
          type="checkbox"
          className="accent-white"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        published
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="solid" disabled={isPending}>
          {isPending ? "saving…" : "save"}
        </Button>
        {initial?.id && (
          <Button type="button" variant="outline" disabled={isPending} onClick={onDelete}>
            delete
          </Button>
        )}
      </div>
    </form>
  );
}
