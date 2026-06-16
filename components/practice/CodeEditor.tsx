"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Lang } from "@/lib/judge/types";

export function CodeEditor({
  lang,
  value,
  onChange,
}: {
  lang: Lang;
  value: string;
  onChange: (v: string) => void;
}) {
  const langExt = lang === "python" ? python() : javascript();

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={oneDark}
      extensions={[langExt]}
      minHeight="280px"
    />
  );
}
