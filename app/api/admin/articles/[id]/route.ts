import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerApi } from "@/lib/auth-server";
import { getArticleById, updateArticle, deleteArticle } from "@/lib/articles";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Full article, body included.
export async function GET(_req: NextRequest, { params }: Params) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return NextResponse.json({ error: "article not found" }, { status: 404 });
  return NextResponse.json(article);
}

// Partial update: only the provided fields change, merged over the current row
// through updateArticle's column whitelist. Same revalidates as
// saveArticleAction.
export async function PATCH(req: NextRequest, { params }: Params) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const existing = await getArticleById(id);
  if (!existing) return NextResponse.json({ error: "article not found" }, { status: 404 });

  let input: {
    title?: string;
    body?: string;
    pattern?: string | null;
    slug?: string;
    published?: boolean;
  };
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof updateArticle>[1] = {};
  if ("title" in input) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    patch.title = title;
  }
  if ("body" in input) patch.body = typeof input.body === "string" ? input.body : "";
  if ("pattern" in input) patch.pattern = input.pattern ?? null;
  if ("slug" in input && input.slug) patch.slug = input.slug;
  if ("published" in input) patch.published = input.published ?? false;

  const article = await updateArticle(id, patch);

  revalidatePath("/articles");
  revalidatePath("/admin/articles");
  revalidatePath("/toolkit");
  if (article.slug) revalidatePath(`/articles/${article.slug}`);

  return NextResponse.json({ ok: true, id: article.id, slug: article.slug });
}

// Mirrors deleteArticleAction, plus a read-first so a bad id is a 404 rather
// than a blind {ok:true}.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const existing = await getArticleById(id);
  if (!existing) return NextResponse.json({ error: "article not found" }, { status: 404 });

  await deleteArticle(id);
  revalidatePath("/articles");
  revalidatePath("/admin/articles");
  revalidatePath("/toolkit");
  return NextResponse.json({ ok: true });
}
