export interface Heading {
  id: string;
  text: string;
  depth: number;
}

/**
 * A plain-text preview of a markdown body, for article cards.
 *
 * Articles have no stored excerpt, so this derives one: drop fenced code,
 * headings, images and math, flatten the remaining inline syntax, then cut on a
 * word boundary. Returns "" for a body with no prose, which the card renders as
 * an empty line rather than a stray ellipsis.
 */
export function excerpt(markdown: string, maxLength = 180): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/^\s*#{1,6}\s+.*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Slugify a heading the way `rehype-slug` (github-slugger) does, so the ids we
 * hand to <Toc> match the ids `prose` actually renders: lowercase, strip
 * anything that isn't a word char/space/hyphen, spaces to hyphens.
 */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Pull ATX headings out of a markdown source for a table of contents.
 *
 * Fenced code blocks are skipped — a `# comment` inside a fence is code, not a
 * heading. Duplicate slugs get `-1`, `-2` suffixes, matching github-slugger's
 * dedupe so deep links stay correct on pages that repeat a heading.
 */
export function extractHeadings(markdown: string, maxDepth = 3): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const depth = match[1].length;
    if (depth > maxDepth) continue;

    // Strip inline markdown emphasis/code/link syntax so the label reads clean.
    const text = match[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .trim();
    if (!text) continue;

    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headings.push({ id: count === 0 ? base : `${base}-${count}`, text, depth });
  }

  return headings;
}
