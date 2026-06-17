import { requireOwner } from "@/lib/auth-server";
import { listArticles } from "@/lib/articles";
import { listProblems } from "@/lib/problems";
import { Card } from "@/components/chrome/card";
import { Button } from "@/components/chrome/button";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireOwner();

  const [problems, articles] = await Promise.all([
    listProblems({ includeUnpublished: true }),
    listArticles({ includeUnpublished: true }),
  ]);

  const problemsPublished = problems.filter((p) => p.published).length;
  const problemsDraft = problems.length - problemsPublished;
  const articlesPublished = articles.filter((a) => a.published).length;
  const articlesDraft = articles.length - articlesPublished;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="text-lg text-white">admin</h1>

      <Card>
        <p className="text-white">problems</p>
        <p className="text-sm text-white/60">
          {problemsPublished} published · {problemsDraft} draft
        </p>
        <div className="mt-1">
          <Button variant="link" href="/admin/problems">
            manage problems
          </Button>
        </div>
      </Card>

      <Card>
        <p className="text-white">articles</p>
        <p className="text-sm text-white/60">
          {articlesPublished} published · {articlesDraft} draft
        </p>
        <div className="mt-1">
          <Button variant="link" href="/admin/articles">
            manage articles
          </Button>
        </div>
      </Card>
    </section>
  );
}
