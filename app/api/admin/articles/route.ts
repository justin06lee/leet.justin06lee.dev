import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerApi } from "@/lib/auth-server";
import { createArticle, listArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

// List every article, published or not. Summary fields only — fetch one by id
// for the body.
export async function GET() {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const articles = await listArticles({ includeUnpublished: true });
  return NextResponse.json(
    articles.map(({ id, slug, title, pattern, published, createdAt, updatedAt }) => ({
      id,
      slug,
      title,
      pattern,
      published,
      createdAt,
      updatedAt,
    })),
  );
}

// Create. Mirrors saveArticleAction's create path (validation + revalidates).
export async function POST(req: NextRequest) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

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

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const article = await createArticle({
    title,
    body: typeof input.body === "string" ? input.body : "",
    pattern: input.pattern ?? null,
    ...(input.slug ? { slug: input.slug } : {}),
    published: input.published ?? false,
  });

  revalidatePath("/articles");
  revalidatePath("/admin/articles");
  revalidatePath("/toolkit");
  if (article.slug) revalidatePath(`/articles/${article.slug}`);

  return NextResponse.json({ ok: true, id: article.id, slug: article.slug });
}
