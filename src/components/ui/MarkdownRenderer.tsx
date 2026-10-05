"use client";

import React, { useMemo } from "react";
import { marked } from "marked";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      // Cấu hình marked với gfm và tự động xuống dòng
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div
      className={`prose-sm text-slate-800 leading-relaxed 
        [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:border-b [&_h1]:border-slate-200 [&_h1]:pb-1
        [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-1.5
        [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-2.5 [&_h3]:mb-1
        [&_p]:my-1.5 [&_p]:leading-relaxed
        [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-2 [&_ol]:space-y-1
        [&_li]:my-0.5
        [&_strong]:font-semibold [&_strong]:text-slate-900
        [&_code]:bg-slate-200/70 [&_code]:text-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
        [&_blockquote]:border-l-3 [&_blockquote]:border-slate-400 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-xs [&_table]:rounded-lg [&_table]:overflow-hidden
        [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-100/80 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-900
        [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-slate-700
        [&_tbody_tr:hover]:bg-slate-50/70
        [&_hr]:my-3 [&_hr]:border-slate-200
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MarkdownRenderer;
