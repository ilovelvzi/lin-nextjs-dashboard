'use client';

import { useState } from 'react';
import { ClipboardDocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

function ContentPane({
  title,
  content,
  accentColor,
}: {
  title: string;
  content: string;
  accentColor: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 ${accentColor}`}>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-white/60 transition-colors"
            title="复制内容"
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-white/60 transition-colors"
            title="下载文件"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            下载
          </button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

export default function CompareView({
  originalContent,
  optimizedContent,
}: {
  originalContent: string;
  optimizedContent: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch min-h-[500px]">
      <ContentPane title="原始简历" content={originalContent} accentColor="bg-gray-100" />
      <ContentPane title="优化后简历" content={optimizedContent} accentColor="bg-blue-50" />
    </div>
  );
}
