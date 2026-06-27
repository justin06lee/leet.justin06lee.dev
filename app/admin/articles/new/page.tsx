import { requireOwner } from "@/lib/auth-server";
import ArticleForm from "@/components/admin/ArticleForm";

export const dynamic = "force-dynamic";

export default async function NewArticle() {
  await requireOwner();

  return <ArticleForm />;
}
