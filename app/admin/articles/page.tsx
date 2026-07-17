import { Plus } from "@/components/icons";
import { requireOwner } from "@/lib/auth-server";
import { listArticles, type Article } from "@/lib/articles";
import { getPattern } from "@/lib/toolkit";
import { deleteArticleAction } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { AdminTable, type AdminColumn } from "@/components/admin/AdminTable";
import { Button } from "@/components/chrome/button";
import { Badge } from "@/components/chrome/badge";
import { FadeIn } from "@/components/chrome/fade-in";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const columns: AdminColumn<Article>[] = [
  {
    key: "title",
    header: "title",
    render: (a) => <span className="text-white">{a.title}</span>,
  },
  {
    key: "pattern",
    header: "pattern",
    hideOnMobile: true,
    render: (a) => (
      <span className="text-white/60">
        {a.pattern ? (getPattern(a.pattern)?.label ?? a.pattern) : "—"}
      </span>
    ),
  },
  {
    key: "published",
    header: "status",
    render: (a) => (
      <Badge variant={a.published ? "solid" : "outline"}>
        {a.published ? "published" : "draft"}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "",
    align: "right",
    render: (a) => (
      <span className="flex items-center justify-end gap-2">
        <Button variant="link" size="sm" href={`/admin/articles/${a.id}/edit`}>
          edit
        </Button>
        <DeleteButton id={a.id} action={deleteArticleAction} />
      </span>
    ),
  },
];

export default async function AdminArticles() {
  await requireOwner();
  const articles = await listArticles({ includeUnpublished: true });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lowercase">
      <PageHeader
        eyebrow="admin"
        title="articles"
        subtitle={`${articles.length} total, drafts included.`}
        actions={
          <Button variant="solid" icon={Plus} href="/admin/articles/new">
            new article
          </Button>
        }
      />
      <FadeIn delay={0.2} className="mt-8">
        <AdminTable
          columns={columns}
          rows={articles}
          getKey={(a) => a.id}
          empty="no articles yet."
        />
      </FadeIn>
    </div>
  );
}
