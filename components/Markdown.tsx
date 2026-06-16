"use client";

import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";

// react-markdown does not render raw HTML unless rehype-raw is added (it is
// not), so there is no dangerouslySetInnerHTML and no extra sanitization is
// needed here.
export default function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-leet flex flex-col gap-4 leading-relaxed text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_code]:font-mono [&_code]:text-sm [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_li]:ml-4 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface [&_pre]:p-4 [&_ul]:list-disc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeSlug]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
