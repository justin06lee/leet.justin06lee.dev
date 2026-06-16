import { requireOwner } from "@/lib/auth-server";
import ArticleForm from "@/components/admin/ArticleForm";

export const dynamic = "force-dynamic";

export default async function NewArticle() {
  await requireOwner();

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="text-lg text-foreground">new article</h1>
      <ArticleForm />
    </section>
  );
}
