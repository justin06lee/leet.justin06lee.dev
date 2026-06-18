import { notFound } from "next/navigation";
import { Article } from "@/components/chrome/article";
import { Prose } from "@/components/chrome/prose";
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

  const patternLabel = article.pattern ? getPattern(article.pattern)?.label : undefined;

  return (
    <Article
      title={article.title}
      date={article.createdAt}
      tags={patternLabel ? [patternLabel] : []}
      backHref="/articles"
    >
      <Prose>{article.body}</Prose>
    </Article>
  );
}
