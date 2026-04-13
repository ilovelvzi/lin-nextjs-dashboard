'use client';

import { useState, useMemo } from 'react';
import {
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import MarkdownContent from './markdown-content';
import { parseResumeIntoSections } from './resume-content';
import OriginalFileViewer from './original-file-viewer';

// ─── Diff algorithm (line-level LCS) ────────────────────────────────────────

type DiffLine =
  | { type: 'equal'; text: string }
  | { type: 'delete'; text: string }
  | { type: 'insert'; text: string };

function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const m = aLines.length;
  const n = bLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        aLines[i - 1] === bLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      result.push({ type: 'equal', text: aLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'insert', text: bLines[j - 1] });
      j--;
    } else {
      result.push({ type: 'delete', text: aLines[i - 1] });
      i--;
    }
  }
  return result.reverse();
}

// ─── Download helpers ────────────────────────────────────────────────────────

/** Minimal Markdown → HTML converter for download/print purposes. */
function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const htmlLines: string[] = [];
  let inList = false;

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Heading
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h1 || h2 || h3) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      if (h1) htmlLines.push(`<h1>${inline(h1[1])}</h1>`);
      else if (h2) htmlLines.push(`<h2>${inline(h2[1])}</h2>`);
      else if (h3) htmlLines.push(`<h3>${inline(h3![1])}</h3>`);
      continue;
    }

    // HR
    if (/^---+$/.test(line)) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      htmlLines.push('<hr>');
      continue;
    }

    // List item
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      if (!inList) { htmlLines.push('<ul>'); inList = true; }
      htmlLines.push(`<li>${inline(li[1])}</li>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      htmlLines.push('');
      continue;
    }

    // Regular paragraph
    if (inList) { htmlLines.push('</ul>'); inList = false; }
    htmlLines.push(`<p>${inline(line)}</p>`);
  }

  if (inList) htmlLines.push('</ul>');
  return htmlLines.join('\n');
}

const PRINT_STYLES = `
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: 11pt; line-height: 1.6; color: #111; margin: 2cm; }
  h1 { font-size: 20pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 2pt; margin: 12pt 0 4pt; }
  h3 { font-size: 11pt; margin: 8pt 0 2pt; }
  p  { margin: 3pt 0; }
  ul { margin: 3pt 0; padding-left: 18pt; }
  li { margin: 2pt 0; }
  hr { border: none; border-top: 1px solid #ccc; margin: 8pt 0; }
  strong { font-weight: 600; }
  @media print { body { margin: 1.5cm; } }
`;

function openPrintWindow(title: string, html: string) {
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return;
  win.document.write(
    `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">` +
    `<title>${title}</title><style>${PRINT_STYLES}</style></head>` +
    `<body>${html}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

function downloadWord(title: string, html: string) {
  const doc =
    `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:w="urn:schemas-microsoft-com:office:word" lang="zh"><head>` +
    `<meta charset="utf-8"><title>${title}</title>` +
    `<style>${PRINT_STYLES}</style></head><body>${html}</body></html>`;
  const blob = new Blob([doc], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadMarkdown(title: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Original content pane (plain-text, section-expanded) ───────────────────

function OriginalPane({
  content,
  onCopy,
  copied,
  resumeId,
  originalFileType,
  originalHtml,
}: {
  content: string;
  onCopy: () => void;
  copied: boolean;
  resumeId?: string | null;
  originalFileType?: 'pdf' | 'docx' | null;
  originalHtml?: string | null;
}) {
  const hasFile = !!originalFileType;
  const sections = useMemo(
    () => (!hasFile ? parseResumeIntoSections(content) : []),
    [content, hasFile],
  );

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-700">原始简历</h3>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-white/60 transition-colors"
          title="复制内容"
        >
          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          {copied ? '已复制' : '复制'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {hasFile ? (
          <OriginalFileViewer
            resumeId={resumeId}
            fileType={originalFileType}
            originalHtml={originalHtml}
            fallbackContent={content}
          />
        ) : (
          <div className="h-full overflow-auto p-4 space-y-4 text-sm text-gray-800">
            {sections.map((section, i) => (
              <div key={`${section.title}-${i}`}>
                <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-gray-100">
                  <section.icon className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    {section.title}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed text-gray-700 text-sm">
                  {section.content}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Optimized content pane (Markdown) ──────────────────────────────────────

function OptimizedPane({
  title,
  content,
  onCopy,
  copied,
}: {
  title: string;
  content: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const html = useMemo(() => markdownToHtml(content), [content]);

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-blue-200 bg-white overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 shrink-0 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700">优化后简历</h3>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={onCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-white/60 transition-colors"
            title="复制 Markdown 内容"
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={() => downloadMarkdown(title, content)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-white/60 transition-colors"
            title="下载 Markdown 文件"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            .md
          </button>
          <button
            onClick={() => downloadWord(title, html)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-white/60 transition-colors"
            title="下载 Word 文档"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            Word
          </button>
          <button
            onClick={() => openPrintWindow(title, html)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-white/60 transition-colors"
            title="打印 / 导出PDF"
          >
            <PrinterIcon className="h-3.5 w-3.5" />
            打印/PDF
          </button>
        </div>
      </div>

      {/* Markdown rendered content */}
      <div className="flex-1 overflow-auto p-5">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}

// ─── DiffView ────────────────────────────────────────────────────────────────

function DiffView({
  originalContent,
  optimizedContent,
}: {
  originalContent: string;
  optimizedContent: string;
}) {
  const diff = useMemo(
    () => diffLines(originalContent, optimizedContent),
    [originalContent, optimizedContent],
  );

  const stats = useMemo(() => {
    const deleted = diff.filter((d) => d.type === 'delete').length;
    const inserted = diff.filter((d) => d.type === 'insert').length;
    return { deleted, inserted };
  }, [diff]);

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">差异对比</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-red-600">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300" />
            删除 {stats.deleted} 行
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300" />
            新增 {stats.inserted} 行
          </span>
        </div>
      </div>
      <div className="overflow-auto font-mono text-sm leading-relaxed">
        {diff.map((line, i) => (
          <div
            key={i}
            className={
              line.type === 'delete'
                ? 'bg-red-50 text-red-800 border-l-4 border-red-400'
                : line.type === 'insert'
                  ? 'bg-green-50 text-green-800 border-l-4 border-green-400'
                  : 'text-gray-700 border-l-4 border-transparent'
            }
          >
            <div className="flex">
              <span className="select-none w-6 shrink-0 text-center text-xs pt-1 pb-1 opacity-50">
                {line.type === 'delete' ? '−' : line.type === 'insert' ? '+' : ' '}
              </span>
              <pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-words font-sans">
                {line.text || '\u00A0'}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CompareView (main export) ───────────────────────────────────────────────

type ViewMode = 'side-by-side' | 'diff';

export default function CompareView({
  originalContent,
  optimizedContent,
  title = '优化后简历',
  resumeId,
  originalFileType,
  originalHtml,
}: {
  originalContent: string;
  optimizedContent: string;
  title?: string;
  resumeId?: string | null;
  originalFileType?: 'pdf' | 'docx' | null;
  originalHtml?: string | null;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedOptimized, setCopiedOptimized] = useState(false);

  const copyOriginal = async () => {
    try {
      await navigator.clipboard.writeText(originalContent);
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } catch { /* ignore */ }
  };

  const copyOptimized = async () => {
    try {
      await navigator.clipboard.writeText(optimizedContent);
      setCopiedOptimized(true);
      setTimeout(() => setCopiedOptimized(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-500" />
        <span className="text-xs text-gray-500 mr-1">显示模式：</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            左右对比
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-200 ${
              viewMode === 'diff'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            差异高亮
          </button>
        </div>
      </div>

      {viewMode === 'side-by-side' ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch min-h-[600px]">
          <OriginalPane
            content={originalContent}
            onCopy={copyOriginal}
            copied={copiedOriginal}
            resumeId={resumeId}
            originalFileType={originalFileType}
            originalHtml={originalHtml}
          />
          <OptimizedPane
            title={title}
            content={optimizedContent}
            onCopy={copyOptimized}
            copied={copiedOptimized}
          />
        </div>
      ) : (
        <DiffView
          originalContent={originalContent}
          optimizedContent={optimizedContent}
        />
      )}
    </div>
  );
}
