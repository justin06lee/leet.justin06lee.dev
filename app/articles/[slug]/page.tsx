import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { getArticleBySlug } from "@/lib/articles";
import { getPattern } from "@/lib/toolkit";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const pattern = article.pattern ? getPattern(article.pattern) : undefined;

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl tracking-tight">{article.title}</h1>
        {pattern && (
          <span className="w-fit rounded border border-border px-2 py-0.5 text-sm text-muted">
            {pattern.label}
          </span>
        )}
      </header>
      <Markdown content={article.body} />
    </article>
  );
}
