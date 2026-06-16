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

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="text-lg text-foreground">edit article</h1>
      <ArticleForm initial={article} />
    </section>
  );
}
