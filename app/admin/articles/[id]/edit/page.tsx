import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth-server";
import { listArticles } from "@/lib/articles";
import ArticleForm from "@/components/admin/ArticleForm";

export const dynamic = "force-dynamic";

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const articles = await listArticles({ includeUnpublished: true });
  const article = articles.find((a) => a.id === id);
  if (!article) notFound();

  return <ArticleForm initial={article} />;
}
