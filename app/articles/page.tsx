import Link from "next/link";
import { listArticles } from "@/lib/articles";
import { getPattern } from "@/lib/toolkit";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await listArticles();

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="font-mono text-3xl tracking-tight">articles</h1>
      {articles.length === 0 ? (
        <p className="text-muted">no articles yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {articles.map((article) => {
            const pattern = article.pattern ? getPattern(article.pattern) : undefined;
            return (
              <li key={article.id}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="flex items-center justify-between rounded border border-border bg-surface px-4 py-3 hover:border-foreground"
                >
                  <span className="text-foreground">{article.title}</span>
                  {pattern && <span className="text-muted text-sm">{pattern.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
