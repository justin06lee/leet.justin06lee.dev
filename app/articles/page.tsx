import { listArticles } from "@/lib/articles";
import { getPattern } from "@/lib/toolkit";
import { excerpt } from "@/lib/markdown";
import { ArticleList } from "@/components/chrome/article-list";
import { Card, CardBody } from "@/components/chrome/card";
import { FadeIn } from "@/components/chrome/fade-in";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await listArticles();

  const previews = articles.map((article) => {
    const pattern = article.pattern ? getPattern(article.pattern) : undefined;
    return {
      slug: article.slug,
      title: article.title,
      excerpt: excerpt(article.body),
      tags: pattern ? [pattern.label, pattern.tier] : [],
      publishedAt: article.createdAt,
    };
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lowercase">
      <PageHeader
        title="articles"
        subtitle="one write-up per pattern — the idea, the trigger, and how to recognize it."
      />

      <FadeIn delay={0.2} className="mt-8">
        {previews.length > 0 ? (
          <ArticleList articles={previews} basePath="/articles" />
        ) : (
          <Card className="border-dashed">
            <CardBody>no articles published yet.</CardBody>
          </Card>
        )}
      </FadeIn>
    </div>
  );
}
