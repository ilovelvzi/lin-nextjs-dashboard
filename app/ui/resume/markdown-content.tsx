"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders markdown-formatted resume content with prose styling.
 * Used for AI-generated (optimized) resume content.
 */
export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-800
      prose-headings:font-semibold prose-headings:text-gray-900
      prose-h1:text-xl prose-h1:mb-2 prose-h1:mt-0
      prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h2:pb-1 prose-h2:border-b prose-h2:border-gray-200
      prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1
      prose-p:my-1 prose-p:leading-relaxed
      prose-ul:my-1 prose-ul:pl-4
      prose-li:my-0.5 prose-li:leading-relaxed
      prose-strong:text-gray-900 prose-strong:font-semibold
      prose-hr:my-3 prose-hr:border-gray-200"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
