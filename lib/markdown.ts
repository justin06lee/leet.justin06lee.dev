export interface Heading {
  id: string;
  text: string;
  depth: number;
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
