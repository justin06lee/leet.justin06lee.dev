"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PATTERNS } from "@/lib/toolkit";
import { saveArticleAction, deleteArticleAction, type ArticleInput } from "@/app/admin/actions";
import type { Article } from "@/lib/articles";
import { Input } from "@/components/chrome/input";
import Select from "@/components/chrome/select";
import { Button } from "@/components/chrome/button";
import { Checkbox } from "@/components/chrome/checkbox";
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
    // Full-screen authoring: a slim toolbar over an editor that fills the
    // viewport below the fixed navbar (matches the /desk editor on justin06lee.dev).
    <form
      onSubmit={onSubmit}
      className="flex h-[calc(100vh-var(--sticky-header-offset,3.5rem))] flex-col lowercase"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <Input
          className="min-w-0 flex-1 normal-case"
          placeholder="article title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select
          value={pattern}
          onChange={(v) => setPattern(v)}
          options={PATTERN_OPTIONS}
          ariaLabel="pattern"
          size="compact"
          className="w-44"
        />
        <Checkbox
          label="published"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        {error && <span className="text-sm text-red-300">{error}</span>}
        <div className="ml-auto flex items-center gap-2">
          <Button type="submit" variant="solid" size="sm" disabled={isPending}>
            {isPending ? "saving…" : "save"}
          </Button>
          {initial?.id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={onDelete}
            >
              delete
            </Button>
          )}
        </div>
      </div>

      <Editor
        className="min-h-0 flex-1 normal-case"
        value={body}
        onChange={setBody}
        placeholder="# write your article in markdown…"
        renderMarkdown={(source, { highlightLine }) => (
          <Prose lineSync highlightLine={highlightLine}>
            {source}
          </Prose>
        )}
      />
    </form>
  );
}
