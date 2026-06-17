import { requireOwner } from "@/lib/auth-server";
import { listArticles } from "@/lib/articles";
import { deleteArticleAction } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { Button } from "@/components/chrome/button";
import { Badge } from "@/components/chrome/badge";

export const dynamic = "force-dynamic";

export default async function AdminArticles() {
  await requireOwner();

  const articles = await listArticles({ includeUnpublished: true });

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-24 lowercase">
      <div className="flex items-center justify-between">
        <h1 className="text-lg text-white">articles</h1>
        <Button variant="link" size="sm" href="/admin/articles/new">
          new article
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/60">
            <th className="py-2 font-normal">title</th>
            <th className="py-2 font-normal">pattern</th>
            <th className="py-2 font-normal">published</th>
            <th className="py-2 font-normal" />
          </tr>
        </thead>
        <tbody>
          {articles.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-white/60">
                no articles yet.
              </td>
            </tr>
          )}
          {articles.map((a) => (
            <tr key={a.id} className="border-b border-white/10">
              <td className="py-2 text-white">{a.title}</td>
              <td className="py-2 text-white/60">{a.pattern ?? "—"}</td>
              <td className="py-2">
                <Badge variant={a.published ? "solid" : "outline"}>
                  {a.published ? "published" : "draft"}
                </Badge>
              </td>
              <td className="flex items-center gap-2 py-2">
                <Button variant="link" size="sm" href={`/admin/articles/${a.id}/edit`}>
                  edit
                </Button>
                <DeleteButton id={a.id} action={deleteArticleAction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
