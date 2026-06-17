import { Card, CardHeader, CardTitle, CardMeta } from "@/components/chrome/card";
import { Badge } from "@/components/chrome/badge";
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
                <Card>
                  <CardHeader>
                    <CardTitle href={`/articles/${article.slug}`}>
                      {article.title}
                    </CardTitle>
                    {pattern && (
                      <CardMeta>
                        <Badge>{pattern.label}</Badge>
                      </CardMeta>
                    )}
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
