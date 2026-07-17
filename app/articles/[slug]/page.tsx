import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@/components/icons";
import { Article } from "@/components/chrome/article";
import { Prose } from "@/components/chrome/prose";
import { Button } from "@/components/chrome/button";
import { getArticleBySlug } from "@/lib/articles";
import { getPattern } from "@/lib/toolkit";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const pattern = article.pattern ? getPattern(article.pattern) : undefined;

  return (
    <Article
      title={article.title}
      date={article.createdAt}
      tags={pattern ? [pattern.label, pattern.tier] : []}
      backHref="/articles"
      backLabel="back to articles"
      className="pb-24 pt-8"
    >
      <Prose linkComponent={Link}>{article.body}</Prose>

      {pattern ? (
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 lowercase">
          <p className="text-sm text-white/50">
            this article teaches <span className="text-white/80">{pattern.label}</span>. drill it
            with the problems on its pattern page.
          </p>
          <Button variant="outline" iconRight={ArrowRight} href={`/patterns/${pattern.key}`}>
            practice this pattern
          </Button>
        </div>
      ) : null}
    </Article>
  );
}
