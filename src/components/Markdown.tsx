"use client";

import { useMemo } from "react";
import { marked } from "marked";

/** Render markdown in-app with a conservative sanitize pass. */
export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(text, { async: false }) as string;
    return raw
      .replace(/<(script|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "")
      .replace(/<(script|iframe|object|embed|form)[^>]*\/?>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, "");
  }, [text]);
  return <div className="prose-earthos" dangerouslySetInnerHTML={{ __html: html }} />;
}
