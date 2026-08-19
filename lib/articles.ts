import { randomUUID } from "crypto";
import type { Row } from "@libsql/client";
import { db, initDb } from "./db";
import { slugify, uniqueSlug } from "./slug";

export interface Article {
  id: string;
  slug: string;
  title: string;
  pattern: string | null;
  body: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapArticleRow(row: Row): Article {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    pattern: (row.pattern as string | null) ?? null,
    body: row.body as string,
    published: Number(row.published) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Whitelisted updatable columns mapped from patch keys.
const COLUMN: Record<string, string> = {
  title: "title",
  body: "body",
  pattern: "pattern",
  slug: "slug",
  published: "published",
};

async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const res = excludeId
    ? await db.execute({
        sql: "SELECT 1 FROM articles WHERE slug = ? AND id != ? LIMIT 1",
        args: [slug, excludeId],
      })
    : await db.execute({
        sql: "SELECT 1 FROM articles WHERE slug = ? LIMIT 1",
        args: [slug],
      });
  return res.rows.length > 0;
}

export async function createArticle(input: {
  title: string;
  body: string;
  pattern?: string | null;
  slug?: string;
  published?: boolean;
}): Promise<Article> {
  await initDb();
  const id = randomUUID();
  const base = slugify(input.slug ?? input.title);
  const slug = await uniqueSlug(base, (s) => slugExists(s));

  await db.execute({
    sql: `INSERT INTO articles (id, slug, title, pattern, body, published)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, slug, input.title, input.pattern ?? null, input.body, input.published ? 1 : 0],
  });

  const res = await db.execute({ sql: "SELECT * FROM articles WHERE id = ?", args: [id] });
  return mapArticleRow(res.rows[0]);
}

export async function updateArticle(
  id: string,
  patch: Partial<{
    title: string;
    body: string;
    pattern: string | null;
    slug: string;
    published: boolean;
  }>,
): Promise<Article> {
  await initDb();

  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
    if (!(key in COLUMN)) continue;
    if (key === "slug") {
      const base = slugify(patch.slug as string);
      const slug = await uniqueSlug(base, (s) => slugExists(s, id));
      sets.push("slug = ?");
      args.push(slug);
    } else if (key === "published") {
      sets.push("published = ?");
      args.push(patch.published ? 1 : 0);
    } else {
      sets.push(`${COLUMN[key]} = ?`);
      args.push((patch[key] as string | null) ?? null);
    }
  }

  sets.push("updated_at = datetime('now')");

  await db.execute({
    sql: `UPDATE articles SET ${sets.join(", ")} WHERE id = ?`,
    args: [...args, id],
  });

  const res = await db.execute({ sql: "SELECT * FROM articles WHERE id = ?", args: [id] });
  return mapArticleRow(res.rows[0]);
}

export async function getArticleById(id: string): Promise<Article | null> {
  await initDb();
  const res = await db.execute({ sql: "SELECT * FROM articles WHERE id = ?", args: [id] });
  if (res.rows.length === 0) return null;
  return mapArticleRow(res.rows[0]);
}

export async function getArticleBySlug(
  slug: string,
  opts?: { includeUnpublished?: boolean },
): Promise<Article | null> {
  await initDb();
  const sql = opts?.includeUnpublished
    ? "SELECT * FROM articles WHERE slug = ?"
    : "SELECT * FROM articles WHERE slug = ? AND published = 1";
  const res = await db.execute({ sql, args: [slug] });
  if (res.rows.length === 0) return null;
  return mapArticleRow(res.rows[0]);
}

export async function listArticles(opts?: { includeUnpublished?: boolean }): Promise<Article[]> {
  await initDb();
  const sql = opts?.includeUnpublished
    ? "SELECT * FROM articles ORDER BY updated_at DESC"
    : "SELECT * FROM articles WHERE published = 1 ORDER BY updated_at DESC";
  const res = await db.execute(sql);
  return res.rows.map(mapArticleRow);
}

export async function deleteArticle(id: string): Promise<void> {
  await initDb();
  await db.execute({ sql: "DELETE FROM articles WHERE id = ?", args: [id] });
}
