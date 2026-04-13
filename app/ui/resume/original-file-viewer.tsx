"use client";

import ResumeContent from "./resume-content";

interface OriginalFileViewerProps {
  resumeId?: string | null;
  fileType?: "pdf" | "docx" | null;
  originalHtml?: string | null;
  fallbackContent: string;
}

export default function OriginalFileViewer({
  resumeId,
  fileType,
  originalHtml,
  fallbackContent,
}: OriginalFileViewerProps) {
  if (fileType === "pdf" && resumeId) {
    return (
      <iframe
        src={`/api/resume/file?id=${resumeId}`}
        className="w-full h-full min-h-[600px] border-0"
        title="原始简历"
      />
    );
  }

  if (fileType === "docx" && originalHtml) {
    return (
      <div
        className="p-6 overflow-auto h-full min-h-[600px] prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: originalHtml }}
      />
    );
  }

  return <ResumeContent content={fallbackContent} />;
}
